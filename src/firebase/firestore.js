import { db } from './config';
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp
} from 'firebase/firestore';

// ============================================================================
// PHARMACISTS COLLECTION
// ============================================================================

export const createPharmacist = async (data) => {
  const docRef = await addDoc(collection(db, 'pharmacists'), {
    ...data,
    created_date: serverTimestamp()
  });
  return { id: docRef.id, ...data };
};

export const getPharmacist = async (id) => {
  const docSnap = await getDoc(doc(db, 'pharmacists', id));
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
};

export const getPharmacistByEmail = async (email) => {
  const q = query(collection(db, 'pharmacists'), where('email', '==', email));
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    const docSnap = snapshot.docs[0];
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
};

export const updatePharmacist = async (id, data) => {
  await updateDoc(doc(db, 'pharmacists', id), data);
  return { id, ...data };
};

// ============================================================================
// CASES COLLECTION
// ============================================================================

export const createCase = async (data) => {
  const docRef = await addDoc(collection(db, 'cases'), {
    ...data,
    created_date: serverTimestamp()
  });
  return { id: docRef.id, ...data };
};

export const getCase = async (id) => {
  const docSnap = await getDoc(doc(db, 'cases', id));
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
};

export const updateCase = async (id, data) => {
  await updateDoc(doc(db, 'cases', id), data);
  return { id, ...data };
};

export const deleteCase = async (id) => {
  await deleteDoc(doc(db, 'cases', id));
  return { id };
};

export const listCases = async (sortField = 'created_date', sortOrder = 'desc', limitCount = 500) => {
  const q = query(
    collection(db, 'cases'),
    orderBy(sortField, sortOrder),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
};

export const filterCases = async (filters, sortField = 'created_date', sortOrder = 'desc') => {
  let q = collection(db, 'cases');
  const constraints = [];

  Object.entries(filters).forEach(([field, value]) => {
    constraints.push(where(field, '==', value));
  });

  constraints.push(orderBy(sortField, sortOrder));

  q = query(q, ...constraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
};

export const getCaseByReference = async (publicReference) => {
  const q = query(collection(db, 'cases'), where('public_reference', '==', publicReference));
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    const docSnap = snapshot.docs[0];
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
};

// ============================================================================
// PHOTOS COLLECTION
// ============================================================================

export const createPhoto = async (data) => {
  const docRef = await addDoc(collection(db, 'photos'), {
    ...data,
    created_date: serverTimestamp()
  });
  return { id: docRef.id, ...data };
};

export const getPhoto = async (id) => {
  const docSnap = await getDoc(doc(db, 'photos', id));
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
};

export const getPhotosByCaseId = async (caseId) => {
  const q = query(collection(db, 'photos'), where('case_id', '==', caseId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
};

export const deletePhoto = async (id) => {
  await deleteDoc(doc(db, 'photos', id));
  return { id };
};

// ============================================================================
// MEDICAL OPINIONS COLLECTION
// ============================================================================

export const createMedicalOpinion = async (data) => {
  const docRef = await addDoc(collection(db, 'medicalOpinions'), {
    ...data,
    created_date: serverTimestamp()
  });
  return { id: docRef.id, ...data };
};

export const getMedicalOpinion = async (id) => {
  const docSnap = await getDoc(doc(db, 'medicalOpinions', id));
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
};

export const updateMedicalOpinion = async (id, data) => {
  await updateDoc(doc(db, 'medicalOpinions', id), data);
  return { id, ...data };
};

export const getMedicalOpinionsByCaseId = async (caseId) => {
  const q = query(
    collection(db, 'medicalOpinions'),
    where('case_id', '==', caseId),
    orderBy('created_date', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
};

// ============================================================================
// AUDIT LOGS COLLECTION
// ============================================================================

export const createAuditLog = async (data) => {
  const docRef = await addDoc(collection(db, 'auditLogs'), {
    ...data,
    timestamp: serverTimestamp(),
    created_date: serverTimestamp()
  });
  return { id: docRef.id, ...data };
};

export const getAuditLog = async (id) => {
  const docSnap = await getDoc(doc(db, 'auditLogs', id));
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
};

export const getAuditLogsByCaseId = async (caseId) => {
  const q = query(
    collection(db, 'auditLogs'),
    where('case_id', '==', caseId),
    orderBy('timestamp', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
};

// ============================================================================
// USERS COLLECTION (for storing additional user profile data)
// ============================================================================

export const createUser = async (uid, data) => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    ...data,
    updated_at: serverTimestamp()
  }).catch(async () => {
    // If document doesn't exist, create it
    const { setDoc } = await import('firebase/firestore');
    await setDoc(userRef, {
      ...data,
      created_date: serverTimestamp(),
      updated_at: serverTimestamp()
    });
  });
  return { id: uid, ...data };
};

export const getUser = async (uid) => {
  const docSnap = await getDoc(doc(db, 'users', uid));
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
};

export const updateUser = async (uid, data) => {
  await updateDoc(doc(db, 'users', uid), {
    ...data,
    updated_at: serverTimestamp()
  });
  return { id: uid, ...data };
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Generate a unique public reference for cases
export const generatePublicReference = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `DP-${timestamp}-${random}`;
};
