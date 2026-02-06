import React, { createContext, useState, useContext, useEffect } from 'react';
import { auth } from '@/firebase/config';
import { getUser, updateUser, createUser } from '@/firebase/firestore';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in
        try {
          // Fetch additional user data from Firestore
          const userData = await getUser(firebaseUser.uid);

          setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email,
            emailVerified: firebaseUser.emailVerified,
            first_name: userData?.first_name || firebaseUser.displayName?.split(' ')[0] || '',
            last_name: userData?.last_name || firebaseUser.displayName?.split(' ').slice(1).join(' ') || '',
            full_name: firebaseUser.displayName || userData?.full_name || '',
            rpps: userData?.rpps || '',
            signature: userData?.signature || '',
            role: userData?.role || 'dermatologist', // Rôle par défaut : dermatologue
            ...userData
          });
          setIsAuthenticated(true);
          setAuthError(null);
        } catch (error) {
          console.error('Error fetching user data:', error);
          // Still set basic auth info even if Firestore fetch fails
          setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email,
            emailVerified: firebaseUser.emailVerified,
            first_name: firebaseUser.displayName?.split(' ')[0] || '',
            last_name: firebaseUser.displayName?.split(' ').slice(1).join(' ') || '',
            full_name: firebaseUser.displayName || '',
            role: 'dermatologist' // Rôle par défaut en cas d'erreur
          });
          setIsAuthenticated(true);
        }
      } else {
        // User is signed out
        setUser(null);
        setIsAuthenticated(false);
      }
      setIsLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    try {
      setIsLoadingAuth(true);
      setAuthError(null);
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result.user;
    } catch (error) {
      console.error('Login error:', error);
      let errorMessage = 'Erreur de connexion';

      switch (error.code) {
        case 'auth/invalid-email':
          errorMessage = 'Adresse email invalide';
          break;
        case 'auth/user-disabled':
          errorMessage = 'Ce compte a ete desactive';
          break;
        case 'auth/user-not-found':
          errorMessage = 'Aucun compte associe a cette adresse email';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Mot de passe incorrect';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Trop de tentatives. Veuillez reessayer plus tard';
          break;
        default:
          errorMessage = error.message;
      }

      setAuthError({
        type: 'login_error',
        message: errorMessage
      });
      throw error;
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const register = async (email, password, additionalData = {}) => {
    try {
      setIsLoadingAuth(true);
      setAuthError(null);

      const result = await createUserWithEmailAndPassword(auth, email, password);

      // Update display name if provided
      if (additionalData.first_name || additionalData.last_name) {
        const displayName = `${additionalData.first_name || ''} ${additionalData.last_name || ''}`.trim();
        await updateProfile(result.user, { displayName });
      }

      // Create user document in Firestore
      await createUser(result.user.uid, {
        email: email,
        first_name: additionalData.first_name || '',
        last_name: additionalData.last_name || '',
        full_name: `${additionalData.first_name || ''} ${additionalData.last_name || ''}`.trim(),
        rpps: additionalData.rpps || '',
        ...additionalData
      });

      return result.user;
    } catch (error) {
      console.error('Registration error:', error);
      let errorMessage = 'Erreur lors de l\'inscription';

      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'Cette adresse email est deja utilisee';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Adresse email invalide';
          break;
        case 'auth/weak-password':
          errorMessage = 'Le mot de passe doit contenir au moins 6 caracteres';
          break;
        default:
          errorMessage = error.message;
      }

      setAuthError({
        type: 'registration_error',
        message: errorMessage
      });
      throw error;
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const logout = async (redirectUrl = null) => {
    try {
      await signOut(auth);
      setUser(null);
      setIsAuthenticated(false);

      if (redirectUrl) {
        window.location.href = redirectUrl;
      }
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Password reset error:', error);
      let errorMessage = 'Erreur lors de la reinitialisation du mot de passe';

      switch (error.code) {
        case 'auth/invalid-email':
          errorMessage = 'Adresse email invalide';
          break;
        case 'auth/user-not-found':
          errorMessage = 'Aucun compte associe a cette adresse email';
          break;
        default:
          errorMessage = error.message;
      }

      setAuthError({
        type: 'reset_password_error',
        message: errorMessage
      });
      throw error;
    }
  };

  const updateMe = async (data) => {
    if (!user?.id) {
      throw new Error('No authenticated user');
    }

    try {
      // Update Firestore user document
      await updateUser(user.id, data);

      // Update Firebase Auth profile if name changed
      if (data.first_name || data.last_name) {
        const displayName = `${data.first_name || user.first_name || ''} ${data.last_name || user.last_name || ''}`.trim();
        await updateProfile(auth.currentUser, { displayName });
      }

      // Update local user state
      setUser(prev => ({
        ...prev,
        ...data,
        full_name: data.first_name || data.last_name
          ? `${data.first_name || prev.first_name || ''} ${data.last_name || prev.last_name || ''}`.trim()
          : prev.full_name
      }));

      return { ...user, ...data };
    } catch (error) {
      console.error('Update user error:', error);
      throw error;
    }
  };

  const navigateToLogin = () => {
    // Navigate to login page - adjust path as needed for your app
    window.location.href = '/Login';
  };

  const checkAppState = async () => {
    // This function is kept for compatibility but simplified
    // Firebase handles auth state automatically via onAuthStateChanged
    setIsLoadingPublicSettings(false);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      login,
      logout,
      register,
      resetPassword,
      updateMe,
      navigateToLogin,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
