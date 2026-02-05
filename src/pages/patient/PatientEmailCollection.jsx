import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Mail, SkipForward } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createQuestionnaireResponse } from '@/firebase/firestore';

export default function PatientEmailCollection() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [questionnaireData, setQuestionnaireData] = useState(null);
  const [emailError, setEmailError] = useState('');

  useEffect(() => {
    // Retrieve questionnaire data from session storage
    const data = sessionStorage.getItem('questionnaireData');
    if (!data) {
      // No questionnaire data, redirect to start
      navigate('/patient');
      return;
    }
    setQuestionnaireData(JSON.parse(data));
  }, [navigate]);

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    if (value && !validateEmail(value)) {
      setEmailError('Veuillez entrer une adresse email valide');
    } else {
      setEmailError('');
    }
  };

  const saveAndNavigate = async (withEmail = true) => {
    if (!questionnaireData) return;

    setIsSubmitting(true);

    try {
      // Save to Firestore
      const dataToSave = {
        ...questionnaireData,
        email: withEmail && email ? email : null,
        userAgent: navigator.userAgent,
        language: navigator.language
      };

      await createQuestionnaireResponse(dataToSave);

      // Clear session storage
      sessionStorage.removeItem('questionnaireData');

      // Navigate based on result
      if (questionnaireData.resultat === 'consultation_urgente') {
        navigate('/patient/resultat-urgent');
      } else {
        navigate('/patient/resultat-standard');
      }
    } catch (error) {
      console.error('Error saving questionnaire:', error);
      alert('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitWithEmail = async (e) => {
    e.preventDefault();
    if (!validateEmail(email)) {
      setEmailError('Veuillez entrer une adresse email valide');
      return;
    }
    await saveAndNavigate(true);
  };

  const handleSkip = async () => {
    await saveAndNavigate(false);
  };

  if (!questionnaireData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-center">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693829947440887924766fee/bee7f8545_Logo.png"
              alt="Tessan"
              className="h-5"
            />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-4 py-12">
        <Card className="p-6 md:p-8">
          <div className="text-center mb-8">
            <div className="h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#f0f5f0' }}>
              <Mail className="h-8 w-8" style={{ color: '#1a3d3d' }} />
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#1a3d3d' }}>
              Votre évaluation est prête !
            </h2>
            <p className="text-gray-600">
              Recevez vos résultats et des conseils personnalisés par email
            </p>
          </div>

          <form onSubmit={handleSubmitWithEmail} className="space-y-6">
            <div>
              <Label htmlFor="email" className="text-base font-medium">
                Adresse email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={handleEmailChange}
                placeholder="votre@email.com"
                className="mt-2"
              />
              {emailError && (
                <p className="text-red-500 text-sm mt-1">{emailError}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || !email || emailError}
              className="w-full py-3 rounded-full"
              style={{ backgroundColor: '#1a3d3d', color: 'white' }}
            >
              {isSubmitting ? 'Envoi en cours...' : (
                <>
                  Voir mon résultat
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">ou</span>
            </div>
          </div>

          <Button
            variant="ghost"
            onClick={handleSkip}
            disabled={isSubmitting}
            className="w-full text-gray-600 hover:text-gray-800"
          >
            <SkipForward className="mr-2 h-4 w-4" />
            Passer cette étape
          </Button>

          <p className="text-xs text-gray-400 text-center mt-6">
            Nous ne partagerons jamais votre email. Vous pouvez vous désabonner à tout moment.
          </p>
        </Card>
      </main>
    </div>
  );
}
