import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Upload, X, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { uploadFile } from '@/firebase/storage';

export default function SubmitCaseQuestionnaire() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [photos, setPhotos] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  const questions = [
    {
      id: 'symptomes',
      question: 'Comment décririez-vous vos symptômes ?',
      subtext: 'Plusieurs choix possibles',
      type: 'checkbox',
      options: [
        { value: 'rougeurs', label: 'Rougeurs' },
        { value: 'demangeaisons', label: 'Démangeaisons' },
        { value: 'secheresse', label: 'Sécheresse' },
        { value: 'douleur', label: 'Douleur' },
        { value: 'boutons_lesions', label: 'Boutons / lésions / plaques' },
        { value: 'autre', label: 'Autre', hasInput: true }
      ]
    },
    {
      id: 'duree',
      question: 'Depuis quand ce problème est-il présent ?',
      type: 'radio',
      options: [
        { value: 'moins_semaine', label: 'Moins d\'une semaine' },
        { value: '1_4semaines', label: '1 à 4 semaines' },
        { value: '1_6mois', label: '1 à 6 mois' },
        { value: 'plus_6mois', label: 'Plus de 6 mois' }
      ]
    },
    {
      id: 'recurrence',
      question: 'Avez-vous déjà eu ce type de problème auparavant ?',
      type: 'radio',
      options: [
        { value: 'oui', label: 'Oui', hasInput: true, inputLabel: 'À quelle fréquence cela revient-il ?' },
        { value: 'non', label: 'Non' }
      ]
    },
    {
      id: 'traitement_actuel',
      question: 'Utilisez-vous actuellement un traitement ou des produits sur votre peau ?',
      type: 'radio',
      options: [
        { value: 'oui', label: 'Oui', hasInput: true, inputLabel: 'Précisez' },
        { value: 'non', label: 'Non' }
      ]
    },
    {
      id: 'nouveau_medicament',
      question: 'Avez-vous reçu un nouveau médicament ou une nouvelle crème prescrite dans les 3 derniers mois ?',
      type: 'radio',
      options: [
        { value: 'oui', label: 'Oui', hasInput: true, inputLabel: 'Précisez' },
        { value: 'non', label: 'Non' }
      ]
    },
    {
      id: 'antecedents',
      question: 'Avez-vous des antécédents médicaux ou familiaux liés à des problèmes dermatologiques ?',
      type: 'radio',
      options: [
        { value: 'oui', label: 'Oui', hasInput: true, inputLabel: 'Précisez' },
        { value: 'non', label: 'Non' },
        { value: 'ne_sais_pas', label: 'Je ne sais pas' }
      ]
    },
    {
      id: 'evolution_lesion',
      question: 'En cas de lésion dermatologique (boutons, plaques, etc.), la lésion a-t-elle un caractère évolutif ?',
      subtext: 'Extension en largeur, en volume, ou modification d\'aspect',
      type: 'radio',
      options: [
        { value: 'oui', label: 'Oui, elle est en évolution' },
        { value: 'non', label: 'Non, elle est stabilisée' },
        { value: 'ne_sais_pas', label: 'Je ne sais pas' }
      ]
    },
    {
      id: 'grains_beaute',
      question: 'Avez-vous des grains de beauté ?',
      type: 'radio',
      options: [
        { value: 'oui', label: 'Oui' },
        { value: 'non', label: 'Non' }
      ]
    },
    {
      id: 'changements_grains',
      question: 'Si oui, avez-vous remarqué des changements dans un ou plusieurs de vos grains de beauté ?',
      subtext: 'Ex. couleur, forme, taille, démangeaisons, saignements…',
      type: 'radio',
      options: [
        { value: 'oui_plusieurs', label: 'Oui, plusieurs ont changé' },
        { value: 'non', label: 'Non, aucun changement' },
        { value: 'ne_sais_pas', label: 'Je ne sais pas' }
      ],
      skipIf: (ans) => ans.grains_beaute === 'non'
    },
    {
      id: 'signes_grain_beaute',
      question: 'Un de vos grains de beauté présente-t-il l\'un des signes suivants ?',
      subtext: 'Sélectionnez tout ce qui s\'applique',
      type: 'checkbox',
      options: [
        { value: 'bordures_irregulieres', label: 'Bordures irrégulières' },
        { value: 'changement_couleur', label: 'Changement de couleur' },
        { value: 'taille_augmente', label: 'Taille qui augmente' },
        { value: 'demangeaisons_saignements', label: 'Démangeaisons ou saignements' },
        { value: 'forme_asymetrique', label: 'Forme asymétrique' },
        { value: 'autre', label: 'Autre', hasInput: true }
      ],
      skipIf: (ans) => ans.grains_beaute === 'non'
    },
    {
      id: 'qualite_vie',
      question: 'Ce problème affecte-t-il votre qualité de vie ?',
      type: 'radio',
      options: [
        { value: 'pas_du_tout', label: 'Pas du tout' },
        { value: 'un_peu', label: 'Un peu' },
        { value: 'moyennement', label: 'Moyennement' },
        { value: 'beaucoup', label: 'Beaucoup' },
        { value: 'enormement', label: 'Énormément' }
      ]
    },
    {
      id: 'photo',
      question: 'Pouvez-vous prendre une photo de la zone affectée ?',
      type: 'photo',
      description: 'Une photo aidera le dermatologue à mieux évaluer votre situation'
    }
  ];

  const totalSteps = questions.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of files) {
        const result = await uploadFile(file, 'photos');
        setPhotos(prev => [...prev, {
          url: result.file_url,
          type: photos.length === 0 ? "Vue d'ensemble" : photos.length === 1 ? "Plan rapproché" : "Macro"
        }]);
      }
    } catch (error) {
      console.error('Erreur upload:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const removePhoto = (index) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleAnswer = (value) => {
    setAnswers({ ...answers, [questions[currentStep].id]: value });
    setTimeout(() => handleNext(), 300);
  };

  const handleCheckboxChange = (questionId, value, checked) => {
    const current = answers[questionId] || [];
    let updated;
    if (checked) {
      updated = [...current, value];
    } else {
      updated = current.filter(v => v !== value);
    }
    setAnswers({ ...answers, [questionId]: updated });
  };

  const handleNext = () => {
    let nextStep = currentStep + 1;
    while (nextStep < totalSteps && questions[nextStep]?.skipIf && questions[nextStep].skipIf(answers)) {
      nextStep++;
    }
    if (nextStep < totalSteps) {
      setCurrentStep(nextStep);
    } else {
      navigate(createPageUrl('SubmitCase'), { state: { questionnaireAnswers: answers, photos } });
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      let prevStep = currentStep - 1;
      while (prevStep >= 0 && questions[prevStep]?.skipIf && questions[prevStep].skipIf(answers)) {
        prevStep--;
      }
      setCurrentStep(Math.max(0, prevStep));
    }
  };

  const canProceed = () => {
    const currentQuestion = questions[currentStep];
    if (currentQuestion.type === 'photo') return true;
    if (currentQuestion.type === 'checkbox') {
      return answers[currentQuestion.id] && answers[currentQuestion.id].length > 0;
    }
    return answers[currentQuestion.id] !== undefined;
  };

  const currentQuestion = questions[currentStep];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-600">
              Question {currentStep + 1} sur {totalSteps}
            </span>
            <span className="text-sm font-medium" style={{ color: '#1a3d3d' }}>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <Card className="p-8 shadow-xl">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {currentQuestion.question}
          </h2>
          {currentQuestion.subtext && (
            <p className="text-gray-500 text-sm mb-6">{currentQuestion.subtext}</p>
          )}
          {currentQuestion.description && (
            <p className="text-gray-600 mb-6">{currentQuestion.description}</p>
          )}

          {currentQuestion.type === 'checkbox' && (
            <div className="space-y-3">
              {currentQuestion.options.map((option) => {
                const isChecked = (answers[currentQuestion.id] || []).includes(option.value);
                return (
                  <div key={option.value}>
                    <div
                      className="flex items-start space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer"
                      style={{
                        borderColor: isChecked ? '#1a3d3d' : '#e5e7eb',
                        backgroundColor: isChecked ? '#f0f5f0' : 'white'
                      }}
                      onClick={() => handleCheckboxChange(currentQuestion.id, option.value, !isChecked)}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={(checked) => handleCheckboxChange(currentQuestion.id, option.value, checked)}
                        id={option.value}
                        className="mt-1"
                      />
                      <Label htmlFor={option.value} className="flex-1 cursor-pointer text-base">
                        {option.label}
                      </Label>
                    </div>
                    {option.hasInput && isChecked && (
                      <Input
                        className="mt-2 ml-10"
                        placeholder="Précisez..."
                        value={answers[`${currentQuestion.id}_${option.value}_detail`] || ''}
                        onChange={(e) => setAnswers({...answers, [`${currentQuestion.id}_${option.value}_detail`]: e.target.value})}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {currentQuestion.type === 'radio' && (
            <div className="space-y-3">
              {currentQuestion.options.map((option) => {
                const isSelected = answers[currentQuestion.id] === option.value;
                return (
                  <div key={option.value}>
                    <div
                      className="flex items-center space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer"
                      style={{
                        borderColor: isSelected ? '#1a3d3d' : '#e5e7eb',
                        backgroundColor: isSelected ? '#f0f5f0' : 'white'
                      }}
                      onClick={() => handleAnswer(option.value)}
                    >
                      <RadioGroupItem value={option.value} id={option.value} />
                      <Label htmlFor={option.value} className="flex-1 cursor-pointer text-base">
                        {option.label}
                      </Label>
                    </div>
                    {option.hasInput && isSelected && (
                      <Input
                        className="mt-2 ml-10"
                        placeholder={option.inputLabel || 'Précisez...'}
                        value={answers[`${currentQuestion.id}_detail`] || ''}
                        onChange={(e) => setAnswers({...answers, [`${currentQuestion.id}_detail`]: e.target.value})}
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {currentQuestion.type === 'photo' && (
            <div className="space-y-4">
              {photos.map((photo, index) => (
                <div key={index} className="relative border rounded-lg p-4 flex items-center gap-4">
                  <img src={photo.url} alt={`Photo ${index + 1}`} className="w-24 h-24 object-cover rounded" />
                  <div className="flex-1">
                    <p className="font-medium">{photo.type}</p>
                    <p className="text-sm text-gray-600">Photo {index + 1}</p>
                  </div>
                  <Button variant="destructive" size="icon" onClick={() => removePhoto(index)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  id="photo-upload"
                  disabled={isUploading}
                />
                <label htmlFor="photo-upload" className="cursor-pointer">
                  {isUploading ? (
                    <>
                      <Upload className="h-12 w-12 text-gray-400 mb-4 animate-pulse mx-auto" />
                      <p className="text-gray-600">Téléchargement en cours...</p>
                    </>
                  ) : (
                    <>
                      <Upload className="h-12 w-12 text-gray-400 mb-4 mx-auto" />
                      <p className="text-gray-900 font-medium mb-2">Cliquez pour ajouter des photos</p>
                      <p className="text-sm text-gray-500">JPG, PNG - Max 15MB par photo</p>
                    </>
                  )}
                </label>
              </div>
            </div>
          )}

          <div className="flex justify-between mt-8 gap-4">
            <Button variant="outline" onClick={handlePrevious} disabled={currentStep === 0}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Précédent
            </Button>

            {currentQuestion.type === 'photo' || currentQuestion.type === 'checkbox' ? (
              <Button onClick={handleNext} style={{ backgroundColor: '#1a3d3d', color: 'white' }}>
                {currentStep === totalSteps - 1 ? 'Continuer' : 'Suivant'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
}