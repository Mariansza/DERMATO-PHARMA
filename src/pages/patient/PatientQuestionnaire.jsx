import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ArrowRight, Camera, X, Upload, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { QUESTIONNAIRE_STEPS, calculateTriageScore } from '@/lib/patientScoring';
import { uploadFile } from '@/firebase/storage';

export default function PatientQuestionnaire() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [description, setDescription] = useState('');

  const totalSteps = QUESTIONNAIRE_STEPS.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;
  const step = QUESTIONNAIRE_STEPS[currentStep];

  const handleAnswer = (value) => {
    setAnswers(prev => ({
      ...prev,
      [step.id]: value
    }));
  };

  const handlePhotoSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner une image');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      alert('L\'image ne doit pas dépasser 10MB');
      return;
    }

    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleRemovePhoto = () => {
    setPhoto(null);
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const canProceed = () => {
    if (step.type === 'photo') return true; // Photo is optional
    if (step.type === 'textarea') return true; // Description is optional
    return answers[step.id] !== undefined;
  };

  const handleNext = async () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Last step - submit questionnaire
      await handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    } else {
      navigate('/patient');
    }
  };

  const handleSubmit = async () => {
    setIsUploading(true);

    try {
      // Upload photo if provided
      let photoPath = null;
      if (photo) {
        const result = await uploadFile(photo, 'questionnaire-photos', true);
        photoPath = result.path;
      }

      // Calculate score
      const { score, resultat } = calculateTriageScore(answers);

      // Prepare data for session storage (will be saved in EmailCollection)
      const questionnaireData = {
        answers,
        description,
        photoPath,
        score,
        resultat,
        submittedAt: new Date().toISOString()
      };

      // Store in session for email collection page
      sessionStorage.setItem('questionnaireData', JSON.stringify(questionnaireData));

      // Navigate to email collection
      navigate('/patient/email-collection');
    } catch (error) {
      console.error('Error submitting questionnaire:', error);
      alert('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsUploading(false);
    }
  };

  const renderStepContent = () => {
    if (step.type === 'photo') {
      return (
        <div className="space-y-6">
          <p className="text-gray-600 text-center">
            Une photo permet une meilleure évaluation de votre problème de peau
          </p>

          {!photoPreview ? (
            <div className="grid grid-cols-2 gap-4">
              {/* Bouton Prendre une photo */}
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-gray-400 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoSelect}
                  className="hidden"
                  id="photo-capture"
                />
                <label htmlFor="photo-capture" className="cursor-pointer block">
                  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                    <Camera className="h-6 w-6 text-green-600" />
                  </div>
                  <p className="text-gray-900 font-medium text-sm">Prendre une photo</p>
                  <p className="text-xs text-gray-400 mt-1">Ouvrir la caméra</p>
                </label>
              </div>

              {/* Bouton Choisir depuis galerie */}
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-gray-400 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/heic"
                  onChange={handlePhotoSelect}
                  className="hidden"
                  id="photo-gallery"
                />
                <label htmlFor="photo-gallery" className="cursor-pointer block">
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
                    <Upload className="h-6 w-6 text-blue-600" />
                  </div>
                  <p className="text-gray-900 font-medium text-sm">Galerie photo</p>
                  <p className="text-xs text-gray-400 mt-1">Choisir une image</p>
                </label>
              </div>
            </div>
          ) : (
            <div className="relative">
              <img
                src={photoPreview}
                alt="Aperçu"
                className="w-full max-h-64 object-contain rounded-xl border"
              />
              <button
                onClick={handleRemovePhoto}
                className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <p className="text-sm text-gray-500 text-center">
            Étape optionnelle - vous pouvez passer
          </p>
        </div>
      );
    }

    if (step.type === 'textarea') {
      return (
        <div className="space-y-4">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={step.placeholder}
            rows={4}
            className="w-full"
          />
          <p className="text-sm text-gray-500 text-center">
            Étape optionnelle - vous pouvez passer
          </p>
        </div>
      );
    }

    // Radio options
    return (
      <div className="space-y-3">
        {step.options.map((option) => (
          <div
            key={option.value}
            onClick={() => handleAnswer(option.value)}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              answers[step.id] === option.value
                ? 'border-[#1a3d3d] bg-[#f0f5f0]'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <Label className="cursor-pointer text-base font-medium">
                {option.label}
              </Label>
              {answers[step.id] === option.value && (
                <Check className="h-5 w-5" style={{ color: '#1a3d3d' }} />
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrevious}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5 mr-1" />
              Retour
            </button>
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693829947440887924766fee/bee7f8545_Logo.png"
              alt="Tessan"
              className="h-5"
            />
            <div className="w-20 text-right text-sm text-gray-500">
              {currentStep + 1}/{totalSteps}
            </div>
          </div>
        </div>
      </header>

      {/* Progress bar */}
      <div className="bg-white border-b">
        <div className="max-w-2xl mx-auto px-4 py-2">
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        <Card className="p-6 md:p-8">
          <h2 className="text-2xl font-bold mb-6 text-center" style={{ color: '#1a3d3d' }}>
            {step.question}
          </h2>

          {renderStepContent()}

          <div className="mt-8 flex justify-end">
            <Button
              onClick={handleNext}
              disabled={!canProceed() || isUploading}
              className="px-8 py-3 rounded-full"
              style={{ backgroundColor: '#1a3d3d', color: 'white' }}
            >
              {isUploading ? (
                <>
                  <Upload className="h-4 w-4 mr-2 animate-spin" />
                  Envoi en cours...
                </>
              ) : currentStep === totalSteps - 1 ? (
                <>
                  Voir mon résultat
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              ) : (
                <>
                  {step.type === 'photo' || step.type === 'textarea' ? 'Continuer' : 'Suivant'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Disclaimer */}
        <p className="text-xs text-gray-400 text-center mt-6">
          Cette évaluation ne remplace pas un diagnostic médical. En cas de doute ou d'urgence, consultez un médecin.
        </p>
      </main>
    </div>
  );
}
