import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Upload, X, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { uploadFile } from '@/firebase/storage';
import {
  createPharmacist,
  createCase,
  createPhoto,
  createAuditLog,
  generatePublicReference
} from '@/firebase/firestore';
import {
  sendPatientConfirmation,
  sendPharmacistConfirmation
} from '@/firebase/email';

export default function SubmitCase() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({});
  const [photos, setPhotos] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalSteps = 15;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  // Validation du numéro de sécurité sociale (NIR)
  const validateSSN = (ssn) => {
    if (!ssn) return { valid: true, message: '', complete: false }; // Champ optionnel

    const digits = ssn.replace(/\D/g, '');

    // Saisie en cours - pas encore 15 chiffres
    if (digits.length < 15) {
      return { valid: true, message: `${digits.length}/15 chiffres`, complete: false };
    }

    // 15 chiffres saisis - on valide la clé
    const nirBase = digits.slice(0, 13);
    const keyProvided = parseInt(digits.slice(13, 15), 10);

    // Calcul de la clé : 97 - (NIR mod 97)
    // Utiliser BigInt pour éviter les problèmes de précision avec les grands nombres
    const nirNumber = BigInt(nirBase);
    const keyCalculated = 97 - Number(nirNumber % 97n);

    if (keyProvided !== keyCalculated) {
      return {
        valid: false,
        message: `Clé de contrôle invalide (attendue: ${keyCalculated.toString().padStart(2, '0')})`,
        complete: true
      };
    }

    return { valid: true, message: 'Numéro valide', complete: true };
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of files) {
        // Upload sans récupérer l'URL (pas de droit de lecture pour utilisateur non authentifié)
        const result = await uploadFile(file, 'photos', true);
        // Miniature locale depuis la mémoire (pas besoin de Firebase)
        const localPreview = URL.createObjectURL(file);
        setPhotos(prev => [...prev, {
          localPreview: localPreview,  // Pour affichage miniature dans le formulaire
          storagePath: result.path,    // Pour stockage en base (médecin récupérera l'URL)
          type: photos.length === 0 ? "Vue d'ensemble" : photos.length === 1 ? "Plan rapproché" : "Macro",
          file
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

  const handlePrevious = () => {
    if (currentStep > 0) {
      let prevStep = currentStep - 1;
      // Skip grain de beaute questions if patient doesn't have them
      if (prevStep === 10 && formData.grains_beaute === 'non') {
        prevStep = 8;
      }
      if (prevStep === 9 && formData.grains_beaute === 'non') {
        prevStep = 8;
      }
      setCurrentStep(prevStep);
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      let nextStep = currentStep + 1;
      // Skip grain de beaute questions if patient doesn't have them
      if (nextStep === 9 && formData.grains_beaute === 'non') {
        nextStep = 11;
      }
      if (nextStep === 10 && formData.grains_beaute === 'non') {
        nextStep = 11;
      }
      setCurrentStep(nextStep);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    let currentOperation = '';
    try {
      currentOperation = 'génération référence';
      const reference = generatePublicReference();
      const submittedAt = new Date().toISOString();
      const slaDueAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

      // Creer le pharmacien
      currentOperation = 'création pharmacien';
      const pharmacist = await createPharmacist({
        first_name: formData.pharmacist_first_name,
        last_name: formData.pharmacist_last_name,
        email: formData.pharmacist_email,
        phone: formData.pharmacist_phone,
        pharmacy_name: formData.pharmacy_name,
        address: formData.pharmacy_full_address,
        postal_code: '',
        city: '',
        rpps: formData.rpps || '',
        adeli: formData.adeli || '',
        finess: formData.finess || '',
        siret: formData.siret || '',
        professional_attestation: formData.professional_attestation
      });

      // Creer le dossier
      currentOperation = 'création dossier';
      // Consolider toutes les reponses du questionnaire
      const questionnaireAnswers = {
        symptomes: formData.symptomes,
        symptomes_autre_detail: formData.symptomes_autre_detail,
        duree_probleme: formData.duree_probleme,
        recurrence: formData.recurrence,
        recurrence_frequence: formData.recurrence_frequence,
        traitement_actuel: formData.traitement_actuel,
        traitement_actuel_detail: formData.traitement_actuel_detail,
        nouveau_medicament: formData.nouveau_medicament,
        nouveau_medicament_detail: formData.nouveau_medicament_detail,
        antecedents_derm: formData.antecedents_derm,
        antecedents_derm_detail: formData.antecedents_derm_detail,
        evolution_lesion: formData.evolution_lesion,
        grains_beaute: formData.grains_beaute,
        changements_grains: formData.changements_grains,
        signes_grains: formData.signes_grains,
        signes_grains_autre_detail: formData.signes_grains_autre_detail,
        qualite_vie: formData.qualite_vie
      };

      const caseRecord = await createCase({
        public_reference: reference,
        pharmacist_id: pharmacist.id,
        pharmacist_name: `${formData.pharmacist_first_name} ${formData.pharmacist_last_name}`,
        pharmacist_email: formData.pharmacist_email,
        pharmacy_name: formData.pharmacy_name,
        pharmacy_city: formData.pharmacy_full_address,
        patient_first_name: formData.patient_first_name,
        patient_last_name: formData.patient_last_name,
        patient_email: formData.patient_email,
        patient_ssn: formData.patient_ssn || '',
        patient_birthdate: formData.patient_birthdate || '',
        clinical_description: JSON.stringify(questionnaireAnswers),
        anatomical_location: 'Via questionnaire',
        duration: formData.duree_probleme || '',
        symptoms: Array.isArray(formData.symptomes) ? formData.symptomes.join(', ') : '',
        prior_treatments: formData.traitement_actuel === 'oui' ? (formData.traitement_actuel_detail || '') : '',
        risk_factors: formData.antecedents_derm === 'oui' ? (formData.antecedents_derm_detail || '') : '',
        perceived_urgency: 'Moderee',
        consent_patient: formData.consent_patient,
        consent_privacy: formData.consent_privacy,
        status: "En attente",
        submitted_at: submittedAt,
        sla_due_at: slaDueAt
      });

      // Creer les photos
      currentOperation = 'enregistrement photos';
      for (const photo of photos) {
        await createPhoto({
          case_id: caseRecord.id,
          storage_path: photo.storagePath,  // Chemin Firebase Storage
          photo_type: photo.type,
          exif_stripped: true
        });
      }

      // Log audit
      currentOperation = 'création log audit';
      await createAuditLog({
        actor_type: "pharmacist",
        actor_id: pharmacist.id,
        actor_name: `${formData.pharmacist_first_name} ${formData.pharmacist_last_name}`,
        case_id: caseRecord.id,
        action: "case_submitted",
        details: `Nouveau dossier soumis: ${reference}`
      });

      // Envoyer les emails de confirmation
      try {
        // Email au patient
        await sendPatientConfirmation({
          patientEmail: formData.patient_email,
          patientName: `${formData.patient_first_name} ${formData.patient_last_name}`,
          reference: reference,
          pharmacyName: formData.pharmacy_name
        });

        // Email au pharmacien
        await sendPharmacistConfirmation({
          pharmacistEmail: formData.pharmacist_email,
          pharmacistName: `${formData.pharmacist_first_name} ${formData.pharmacist_last_name}`,
          patientName: `${formData.patient_first_name} ${formData.patient_last_name}`,
          reference: reference,
          pharmacyName: formData.pharmacy_name
        });
      } catch (emailError) {
        // Ne pas bloquer la soumission si l'email échoue
        console.error('Erreur envoi email:', emailError);
      }

      // Rediriger vers confirmation
      navigate(createPageUrl('CaseConfirmation') + `?ref=${reference}`);
    } catch (error) {
      console.error('Erreur soumission:', error);
      console.error('Opération échouée:', currentOperation);
      alert(`Erreur lors de la soumission (${currentOperation}). ${error.message || 'Veuillez réessayer.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    if (currentStep === 0) {
      return formData.pharmacist_first_name && formData.pharmacist_last_name &&
             formData.pharmacist_email && formData.pharmacist_phone &&
             formData.pharmacy_name && formData.pharmacy_full_address &&
             formData.adeli && formData.professional_attestation;
    }
    if (currentStep === 1) {
      const ssnResult = validateSSN(formData.patient_ssn);
      const ssnIsValid = !ssnResult.complete || ssnResult.valid; // OK si pas complet ou si complet et valide
      return formData.patient_first_name && formData.patient_last_name && formData.patient_email && formData.consent_patient && ssnIsValid;
    }
    // Questionnaire steps 2-12
    if (currentStep === 2) return formData.symptomes?.length > 0;
    if (currentStep === 3) return formData.duree_probleme;
    if (currentStep === 4) return formData.recurrence;
    if (currentStep === 5) return formData.traitement_actuel;
    if (currentStep === 6) return formData.nouveau_medicament;
    if (currentStep === 7) return formData.antecedents_derm;
    if (currentStep === 8) return formData.grains_beaute;
    if (currentStep === 9) return formData.changements_grains;
    if (currentStep === 10) return formData.signes_grains?.length > 0;
    if (currentStep === 11) return formData.qualite_vie;
    // Photos
    if (currentStep === 12) {
      return photos.length >= 2;
    }
    // Summary
    if (currentStep === 13) {
      return formData.consent_privacy;
    }
    return true;
  };

  const handleCheckboxChange = (field, value, checked) => {
    const current = formData[field] || [];
    let updated;
    if (checked) {
      updated = [...current, value];
    } else {
      updated = current.filter(v => v !== value);
    }
    setFormData({ ...formData, [field]: updated });
  };

  const handleAnswer = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  // Validation helpers
  const formatPhone = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    return digits.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
  };

  const formatSSN = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 15);
    if (digits.length <= 1) return digits;
    if (digits.length <= 3) return `${digits.slice(0, 1)} ${digits.slice(1)}`;
    if (digits.length <= 5) return `${digits.slice(0, 1)} ${digits.slice(1, 3)} ${digits.slice(3)}`;
    if (digits.length <= 7) return `${digits.slice(0, 1)} ${digits.slice(1, 3)} ${digits.slice(3, 5)} ${digits.slice(5)}`;
    if (digits.length <= 10) return `${digits.slice(0, 1)} ${digits.slice(1, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 7)} ${digits.slice(7)}`;
    if (digits.length <= 13) return `${digits.slice(0, 1)} ${digits.slice(1, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 10)} ${digits.slice(10)}`;
    return `${digits.slice(0, 1)} ${digits.slice(1, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 10)} ${digits.slice(10, 13)} ${digits.slice(13)}`;
  };

  const formatDate = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  };

  const formatNumericOnly = (value, maxLength) => {
    return value.replace(/\D/g, '').slice(0, maxLength);
  };

  const ssnValidation = validateSSN(formData.patient_ssn);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-600">
              Étape {currentStep + 1} sur {totalSteps}
            </span>
            <span className="text-sm font-medium" style={{ color: '#1a3d3d' }}>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <Card className="p-8 shadow-xl">
          {/* Step 0: Pharmacien */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: '#1a3d3d' }}>Informations Pharmacien titulaire</h2>
                <p className="text-gray-600">Vos coordonnées professionnelles</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">Prénom *</Label>
                  <Input
                    id="first_name"
                    value={formData.pharmacist_first_name || ''}
                    onChange={(e) => setFormData({...formData, pharmacist_first_name: e.target.value})}
                    placeholder="Prénom"
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">Nom *</Label>
                  <Input
                    id="last_name"
                    value={formData.pharmacist_last_name || ''}
                    onChange={(e) => setFormData({...formData, pharmacist_last_name: e.target.value})}
                    placeholder="Nom"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email professionnel *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.pharmacist_email || ''}
                    onChange={(e) => setFormData({...formData, pharmacist_email: e.target.value})}
                    placeholder="email@pharmacie.fr"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Téléphone *</Label>
                  <Input
                    id="phone"
                    value={formData.pharmacist_phone || ''}
                    onChange={(e) => setFormData({...formData, pharmacist_phone: formatPhone(e.target.value)})}
                    placeholder="06 12 34 56 78"
                    maxLength={14}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="pharmacy_name">Nom de la pharmacie *</Label>
                <Input
                  id="pharmacy_name"
                  value={formData.pharmacy_name || ''}
                  onChange={(e) => setFormData({...formData, pharmacy_name: e.target.value})}
                  placeholder="Pharmacie de..."
                />
              </div>

              <div>
                <Label htmlFor="pharmacy_full_address">Adresse de la pharmacie *</Label>
                <Textarea
                  id="pharmacy_full_address"
                  value={formData.pharmacy_full_address || ''}
                  onChange={(e) => setFormData({...formData, pharmacy_full_address: e.target.value})}
                  placeholder="12 rue de la République, 75001 Paris"
                  className="min-h-20"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rpps">Numéro RPPS (optionnel)</Label>
                  <Input
                    id="rpps"
                    value={formData.rpps || ''}
                    onChange={(e) => setFormData({...formData, rpps: formatNumericOnly(e.target.value, 11)})}
                    placeholder="10000000000"
                    maxLength={11}
                  />
                </div>
                <div>
                  <Label htmlFor="adeli">Numéro ADELI / FINESS *</Label>
                  <Input
                    id="adeli"
                    value={formData.adeli || ''}
                    onChange={(e) => setFormData({...formData, adeli: formatNumericOnly(e.target.value, 9)})}
                    placeholder="750000000"
                    maxLength={9}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="professional"
                  checked={formData.professional_attestation || false}
                  onCheckedChange={(checked) => setFormData({...formData, professional_attestation: checked})}
                />
                <Label htmlFor="professional" className="text-sm">
                  J'atteste être un professionnel de santé habilité à exercer *
                </Label>
              </div>
            </div>
          )}

          {/* Step 1: Patient */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: '#1a3d3d' }}>Informations Patient</h2>
                <p className="text-gray-600">Données minimales nécessaires</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="patient_first_name">Prénom du patient *</Label>
                  <Input
                    id="patient_first_name"
                    value={formData.patient_first_name || ''}
                    onChange={(e) => setFormData({...formData, patient_first_name: e.target.value})}
                    placeholder="Prénom"
                  />
                </div>
                <div>
                  <Label htmlFor="patient_last_name">Nom du patient *</Label>
                  <Input
                    id="patient_last_name"
                    value={formData.patient_last_name || ''}
                    onChange={(e) => setFormData({...formData, patient_last_name: e.target.value})}
                    placeholder="Nom"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="patient_email">Email du patient *</Label>
                <Input
                  id="patient_email"
                  type="email"
                  value={formData.patient_email || ''}
                  onChange={(e) => setFormData({...formData, patient_email: e.target.value})}
                  placeholder="patient@email.com"
                />
              </div>

              <div>
                <Label htmlFor="patient_ssn">Numéro de sécurité sociale</Label>
                <Input
                  id="patient_ssn"
                  value={formData.patient_ssn || ''}
                  onChange={(e) => setFormData({...formData, patient_ssn: formatSSN(e.target.value)})}
                  placeholder="1 23 45 67 890 123 45"
                  maxLength={21}
                  className={ssnValidation.complete
                    ? (ssnValidation.valid ? 'border-green-500' : 'border-red-500')
                    : ''
                  }
                />
                {formData.patient_ssn && formData.patient_ssn.replace(/\D/g, '').length > 0 && (
                  <p className={`text-xs mt-1 ${
                    ssnValidation.complete
                      ? (ssnValidation.valid ? 'text-green-600' : 'text-red-600')
                      : 'text-gray-500'
                  }`}>
                    {ssnValidation.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="birthdate">Date de naissance</Label>
                <Input
                  id="birthdate"
                  value={formData.patient_birthdate || ''}
                  onChange={(e) => setFormData({...formData, patient_birthdate: formatDate(e.target.value)})}
                  placeholder="JJ/MM/AAAA"
                  maxLength={10}
                />
              </div>

              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="consent"
                    checked={formData.consent_patient || false}
                    onCheckedChange={(checked) => setFormData({...formData, consent_patient: checked})}
                  />
                  <Label htmlFor="consent" className="text-sm text-blue-900">
                    <strong>Consentement patient requis *</strong><br/>
                    J'atteste que le patient a été informé et a consenti au recueil et au traitement de ses données de santé dans le cadre de cette téléexpertise dermatologique.
                  </Label>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Question Symptomes */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: '#1a3d3d' }}>Comment décririez-vous vos symptômes ?</h2>
                <p className="text-gray-600">Plusieurs choix possibles</p>
              </div>

              <div className="space-y-3">
                {[
                  { value: 'rougeurs', label: 'Rougeurs' },
                  { value: 'demangeaisons', label: 'Démangeaisons' },
                  { value: 'secheresse', label: 'Sécheresse' },
                  { value: 'douleur', label: 'Douleur' },
                  { value: 'boutons_lesions', label: 'Boutons / lésions / plaques' }
                ].map((option) => {
                  const isChecked = (formData.symptomes || []).includes(option.value);
                  return (
                    <div
                      key={option.value}
                      className="flex items-center space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer"
                      style={{
                        borderColor: isChecked ? '#1a3d3d' : '#e5e7eb',
                        backgroundColor: isChecked ? '#f0f5f0' : 'white'
                      }}
                      onClick={() => handleCheckboxChange('symptomes', option.value, !isChecked)}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={(checked) => handleCheckboxChange('symptomes', option.value, checked)}
                        id={option.value}
                      />
                      <Label htmlFor={option.value} className="flex-1 cursor-pointer text-base">
                        {option.label}
                      </Label>
                    </div>
                  );
                })}
                <div>
                  <div
                    className="flex items-center space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer"
                    style={{
                      borderColor: (formData.symptomes || []).includes('autre') ? '#1a3d3d' : '#e5e7eb',
                      backgroundColor: (formData.symptomes || []).includes('autre') ? '#f0f5f0' : 'white'
                    }}
                    onClick={() => handleCheckboxChange('symptomes', 'autre', !(formData.symptomes || []).includes('autre'))}
                  >
                    <Checkbox
                      checked={(formData.symptomes || []).includes('autre')}
                      onCheckedChange={(checked) => handleCheckboxChange('symptomes', 'autre', checked)}
                      id="symptome-autre"
                    />
                    <Label htmlFor="symptome-autre" className="flex-1 cursor-pointer text-base">
                      Autre
                    </Label>
                  </div>
                  {(formData.symptomes || []).includes('autre') && (
                    <Input
                      className="mt-2 ml-10"
                      placeholder="Précisez..."
                      value={formData.symptomes_autre_detail || ''}
                      onChange={(e) => setFormData({...formData, symptomes_autre_detail: e.target.value})}
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Duree */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: '#1a3d3d' }}>Depuis quand ce problème est-il présent ?</h2>
              </div>

              <RadioGroup value={formData.duree_probleme} onValueChange={(value) => handleAnswer('duree_probleme', value)}>
                <div className="space-y-3">
                  {[
                    { value: 'moins_semaine', label: 'Moins d\'une semaine' },
                    { value: '1_4semaines', label: '1 à 4 semaines' },
                    { value: '1_6mois', label: '1 à 6 mois' },
                    { value: 'plus_6mois', label: 'Plus de 6 mois' }
                  ].map((option) => {
                    const isSelected = formData.duree_probleme === option.value;
                    return (
                      <div
                        key={option.value}
                        className="flex items-center space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer"
                        style={{
                          borderColor: isSelected ? '#1a3d3d' : '#e5e7eb',
                          backgroundColor: isSelected ? '#f0f5f0' : 'white'
                        }}
                        onClick={() => handleAnswer('duree_probleme', option.value)}
                      >
                        <RadioGroupItem value={option.value} id={option.value} />
                        <Label htmlFor={option.value} className="flex-1 cursor-pointer text-base">
                          {option.label}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Step 4: Recurrence */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: '#1a3d3d' }}>Avez-vous déjà eu ce type de problème auparavant ?</h2>
              </div>

              <RadioGroup value={formData.recurrence} onValueChange={(value) => setFormData({...formData, recurrence: value})}>
                <div className="space-y-3">
                  {[
                    { value: 'oui', label: 'Oui' },
                    { value: 'non', label: 'Non' }
                  ].map((option) => {
                    const isSelected = formData.recurrence === option.value;
                    return (
                      <div key={option.value}>
                        <div
                          className="flex items-center space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer"
                          style={{
                            borderColor: isSelected ? '#1a3d3d' : '#e5e7eb',
                            backgroundColor: isSelected ? '#f0f5f0' : 'white'
                          }}
                          onClick={() => setFormData({...formData, recurrence: option.value})}
                        >
                          <RadioGroupItem value={option.value} id={`recurrence-${option.value}`} />
                          <Label htmlFor={`recurrence-${option.value}`} className="flex-1 cursor-pointer text-base">
                            {option.label}
                          </Label>
                        </div>
                        {option.value === 'oui' && isSelected && (
                          <Input
                            className="mt-2 ml-10"
                            placeholder="À quelle fréquence cela revient-il ?"
                            value={formData.recurrence_frequence || ''}
                            onChange={(e) => setFormData({...formData, recurrence_frequence: e.target.value})}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Step 5: Traitement actuel */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: '#1a3d3d' }}>Utilisez-vous actuellement un traitement ou des produits sur votre peau ?</h2>
              </div>

              <RadioGroup value={formData.traitement_actuel} onValueChange={(value) => setFormData({...formData, traitement_actuel: value})}>
                <div className="space-y-3">
                  {[
                    { value: 'oui', label: 'Oui' },
                    { value: 'non', label: 'Non' }
                  ].map((option) => {
                    const isSelected = formData.traitement_actuel === option.value;
                    return (
                      <div key={option.value}>
                        <div
                          className="flex items-center space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer"
                          style={{
                            borderColor: isSelected ? '#1a3d3d' : '#e5e7eb',
                            backgroundColor: isSelected ? '#f0f5f0' : 'white'
                          }}
                          onClick={() => setFormData({...formData, traitement_actuel: option.value})}
                        >
                          <RadioGroupItem value={option.value} id={`traitement-${option.value}`} />
                          <Label htmlFor={`traitement-${option.value}`} className="flex-1 cursor-pointer text-base">
                            {option.label}
                          </Label>
                        </div>
                        {option.value === 'oui' && isSelected && (
                          <Input
                            className="mt-2 ml-10"
                            placeholder="Précisez"
                            value={formData.traitement_actuel_detail || ''}
                            onChange={(e) => setFormData({...formData, traitement_actuel_detail: e.target.value})}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Step 6: Nouveau medicament */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: '#1a3d3d' }}>Avez-vous reçu un nouveau médicament ou une nouvelle crème prescrite dans les 3 derniers mois ?</h2>
              </div>

              <RadioGroup value={formData.nouveau_medicament} onValueChange={(value) => setFormData({...formData, nouveau_medicament: value})}>
                <div className="space-y-3">
                  {[
                    { value: 'oui', label: 'Oui' },
                    { value: 'non', label: 'Non' }
                  ].map((option) => {
                    const isSelected = formData.nouveau_medicament === option.value;
                    return (
                      <div key={option.value}>
                        <div
                          className="flex items-center space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer"
                          style={{
                            borderColor: isSelected ? '#1a3d3d' : '#e5e7eb',
                            backgroundColor: isSelected ? '#f0f5f0' : 'white'
                          }}
                          onClick={() => setFormData({...formData, nouveau_medicament: option.value})}
                        >
                          <RadioGroupItem value={option.value} id={`medicament-${option.value}`} />
                          <Label htmlFor={`medicament-${option.value}`} className="flex-1 cursor-pointer text-base">
                            {option.label}
                          </Label>
                        </div>
                        {option.value === 'oui' && isSelected && (
                          <Input
                            className="mt-2 ml-10"
                            placeholder="Précisez"
                            value={formData.nouveau_medicament_detail || ''}
                            onChange={(e) => setFormData({...formData, nouveau_medicament_detail: e.target.value})}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Step 7: Antecedents */}
          {currentStep === 7 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: '#1a3d3d' }}>Avez-vous des antécédents médicaux ou familiaux liés à des problèmes dermatologiques ?</h2>
              </div>

              <RadioGroup value={formData.antecedents_derm} onValueChange={(value) => setFormData({...formData, antecedents_derm: value})}>
                <div className="space-y-3">
                  {[
                    { value: 'oui', label: 'Oui' },
                    { value: 'non', label: 'Non' },
                    { value: 'ne_sais_pas', label: 'Je ne sais pas' }
                  ].map((option) => {
                    const isSelected = formData.antecedents_derm === option.value;
                    return (
                      <div key={option.value}>
                        <div
                          className="flex items-center space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer"
                          style={{
                            borderColor: isSelected ? '#1a3d3d' : '#e5e7eb',
                            backgroundColor: isSelected ? '#f0f5f0' : 'white'
                          }}
                          onClick={() => setFormData({...formData, antecedents_derm: option.value})}
                        >
                          <RadioGroupItem value={option.value} id={`antecedents-${option.value}`} />
                          <Label htmlFor={`antecedents-${option.value}`} className="flex-1 cursor-pointer text-base">
                            {option.label}
                          </Label>
                        </div>
                        {option.value === 'oui' && isSelected && (
                          <Input
                            className="mt-2 ml-10"
                            placeholder="Précisez"
                            value={formData.antecedents_derm_detail || ''}
                            onChange={(e) => setFormData({...formData, antecedents_derm_detail: e.target.value})}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Step 8: Grains de beaute */}
          {currentStep === 8 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: '#1a3d3d' }}>Avez-vous des grains de beauté ?</h2>
              </div>

              <RadioGroup value={formData.grains_beaute} onValueChange={(value) => handleAnswer('grains_beaute', value)}>
                <div className="space-y-3">
                  {[
                    { value: 'oui', label: 'Oui' },
                    { value: 'non', label: 'Non' }
                  ].map((option) => {
                    const isSelected = formData.grains_beaute === option.value;
                    return (
                      <div
                        key={option.value}
                        className="flex items-center space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer"
                        style={{
                          borderColor: isSelected ? '#1a3d3d' : '#e5e7eb',
                          backgroundColor: isSelected ? '#f0f5f0' : 'white'
                        }}
                        onClick={() => handleAnswer('grains_beaute', option.value)}
                      >
                        <RadioGroupItem value={option.value} id={`grains-${option.value}`} />
                        <Label htmlFor={`grains-${option.value}`} className="flex-1 cursor-pointer text-base">
                          {option.label}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Step 9: Changements grains */}
          {currentStep === 9 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: '#1a3d3d' }}>Avez-vous remarqué des changements dans un ou plusieurs de vos grains de beauté ?</h2>
                <p className="text-gray-600">Ex. couleur, forme, taille, démangeaisons, saignements...</p>
              </div>

              <RadioGroup value={formData.changements_grains} onValueChange={(value) => handleAnswer('changements_grains', value)}>
                <div className="space-y-3">
                  {[
                    { value: 'oui_plusieurs', label: 'Oui, plusieurs ont changé' },
                    { value: 'non', label: 'Non, aucun changement' },
                    { value: 'ne_sais_pas', label: 'Je ne sais pas' }
                  ].map((option) => {
                    const isSelected = formData.changements_grains === option.value;
                    return (
                      <div
                        key={option.value}
                        className="flex items-center space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer"
                        style={{
                          borderColor: isSelected ? '#1a3d3d' : '#e5e7eb',
                          backgroundColor: isSelected ? '#f0f5f0' : 'white'
                        }}
                        onClick={() => handleAnswer('changements_grains', option.value)}
                      >
                        <RadioGroupItem value={option.value} id={`changements-${option.value}`} />
                        <Label htmlFor={`changements-${option.value}`} className="flex-1 cursor-pointer text-base">
                          {option.label}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Step 10: Signes grains de beaute */}
          {currentStep === 10 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: '#1a3d3d' }}>Un de vos grains de beauté présente-t-il l'un des signes suivants ?</h2>
                <p className="text-gray-600">Sélectionnez tout ce qui s'applique</p>
              </div>

              <div className="space-y-3">
                {[
                  { value: 'bordures_irregulieres', label: 'Bordures irrégulières' },
                  { value: 'changement_couleur', label: 'Changement de couleur' },
                  { value: 'taille_augmente', label: 'Taille qui augmente' },
                  { value: 'demangeaisons_saignements', label: 'Démangeaisons ou saignements' },
                  { value: 'forme_asymetrique', label: 'Forme asymétrique' }
                ].map((option) => {
                  const isChecked = (formData.signes_grains || []).includes(option.value);
                  return (
                    <div
                      key={option.value}
                      className="flex items-center space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer"
                      style={{
                        borderColor: isChecked ? '#1a3d3d' : '#e5e7eb',
                        backgroundColor: isChecked ? '#f0f5f0' : 'white'
                      }}
                      onClick={() => handleCheckboxChange('signes_grains', option.value, !isChecked)}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={(checked) => handleCheckboxChange('signes_grains', option.value, checked)}
                        id={`signes-${option.value}`}
                      />
                      <Label htmlFor={`signes-${option.value}`} className="flex-1 cursor-pointer text-base">
                        {option.label}
                      </Label>
                    </div>
                  );
                })}
                <div>
                  <div
                    className="flex items-center space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer"
                    style={{
                      borderColor: (formData.signes_grains || []).includes('autre') ? '#1a3d3d' : '#e5e7eb',
                      backgroundColor: (formData.signes_grains || []).includes('autre') ? '#f0f5f0' : 'white'
                    }}
                    onClick={() => handleCheckboxChange('signes_grains', 'autre', !(formData.signes_grains || []).includes('autre'))}
                  >
                    <Checkbox
                      checked={(formData.signes_grains || []).includes('autre')}
                      onCheckedChange={(checked) => handleCheckboxChange('signes_grains', 'autre', checked)}
                      id="signes-autre"
                    />
                    <Label htmlFor="signes-autre" className="flex-1 cursor-pointer text-base">
                      Autre
                    </Label>
                  </div>
                  {(formData.signes_grains || []).includes('autre') && (
                    <Input
                      className="mt-2 ml-10"
                      placeholder="Précisez..."
                      value={formData.signes_grains_autre_detail || ''}
                      onChange={(e) => setFormData({...formData, signes_grains_autre_detail: e.target.value})}
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 11: Qualite de vie */}
          {currentStep === 11 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: '#1a3d3d' }}>Ce problème affecte-t-il votre qualité de vie ?</h2>
              </div>

              <RadioGroup value={formData.qualite_vie} onValueChange={(value) => handleAnswer('qualite_vie', value)}>
                <div className="space-y-3">
                  {[
                    { value: 'pas_du_tout', label: 'Pas du tout' },
                    { value: 'un_peu', label: 'Un peu' },
                    { value: 'moyennement', label: 'Moyennement' },
                    { value: 'beaucoup', label: 'Beaucoup' },
                    { value: 'enormement', label: 'Énormément' }
                  ].map((option) => {
                    const isSelected = formData.qualite_vie === option.value;
                    return (
                      <div
                        key={option.value}
                        className="flex items-center space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer"
                        style={{
                          borderColor: isSelected ? '#1a3d3d' : '#e5e7eb',
                          backgroundColor: isSelected ? '#f0f5f0' : 'white'
                        }}
                        onClick={() => handleAnswer('qualite_vie', option.value)}
                      >
                        <RadioGroupItem value={option.value} id={`qualite-${option.value}`} />
                        <Label htmlFor={`qualite-${option.value}`} className="flex-1 cursor-pointer text-base">
                          {option.label}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Step 12: Photos */}
          {currentStep === 12 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: '#1a3d3d' }}>Photos de la lésion</h2>
                <p className="text-gray-600">Minimum 2 photos requises (recommandé : 3 à 5)</p>
              </div>

              <div className="space-y-4">
                {photos.map((photo, index) => (
                  <div key={index} className="relative border rounded-lg p-4 flex items-center gap-4">
                    <img src={photo.localPreview} alt={`Photo ${index + 1}`} className="w-24 h-24 object-cover rounded" />
                    <div className="flex-1">
                      <p className="font-medium">{photo.type}</p>
                      <p className="text-sm text-gray-600">Photo {index + 1}</p>
                    </div>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => removePhoto(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Bouton Prendre une photo */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="photo-capture"
                    disabled={isUploading}
                  />
                  <label htmlFor="photo-capture" className="cursor-pointer block">
                    <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                      <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <p className="text-gray-900 font-medium text-sm">Prendre une photo</p>
                  </label>
                </div>

                {/* Bouton Choisir depuis galerie */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/heic"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    id="photo-upload"
                    disabled={isUploading}
                  />
                  <label htmlFor="photo-upload" className="cursor-pointer block">
                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
                      <Upload className="h-6 w-6 text-blue-600" />
                    </div>
                    <p className="text-gray-900 font-medium text-sm">Galerie photo</p>
                  </label>
                </div>
              </div>

              {isUploading && (
                <div className="text-center py-4">
                  <Upload className="h-8 w-8 text-gray-400 mb-2 animate-pulse mx-auto" />
                  <p className="text-gray-600">Téléchargement en cours...</p>
                </div>
              )}

              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-sm text-amber-900 font-medium mb-2">Conseils photo dans l'ordre suivant :</p>
                <ul className="text-sm text-amber-800 space-y-1">
                  <li>- <strong>Vue d'ensemble</strong> : contexte large de la zone</li>
                  <li>- <strong>Plan rapproché</strong> : lésion centrée et nette</li>
                  <li>- <strong>Macro</strong> : détails texture/couleur</li>
                  <li>- Éclairage naturel, sans flash direct</li>
                  <li>- Éviter les ombres et les flous</li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 13: Récapitulatif */}
          {currentStep === 13 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: '#1a3d3d' }}>Récapitulatif</h2>
                <p className="text-gray-600">Vérifiez les informations avant soumission</p>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold mb-2">Pharmacien</h3>
                  <p className="text-sm text-gray-700">{formData.pharmacist_first_name} {formData.pharmacist_last_name}</p>
                  <p className="text-sm text-gray-700">{formData.pharmacy_name}</p>
                  <p className="text-sm text-gray-700">{formData.pharmacy_full_address}</p>
                  <p className="text-sm text-gray-700">{formData.pharmacist_email} - {formData.pharmacist_phone}</p>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold mb-2">Patient</h3>
                  <p className="text-sm text-gray-700">{formData.patient_first_name} {formData.patient_last_name}</p>
                  {formData.patient_birthdate && <p className="text-sm text-gray-700">Date de naissance: {formData.patient_birthdate}</p>}
                  {formData.patient_ssn && <p className="text-sm text-gray-700">SS: {formData.patient_ssn}</p>}
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold mb-2">Photos</h3>
                  <p className="text-sm text-gray-700">{photos.length} photo(s) jointe(s)</p>
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="privacy"
                    checked={formData.consent_privacy || false}
                    onCheckedChange={(checked) => setFormData({...formData, consent_privacy: checked})}
                  />
                  <Label htmlFor="privacy" className="text-sm text-blue-900">
                    <strong>Politique de confidentialité *</strong><br/>
                    J'accepte que les données de santé collectées soient traitées et transmises à un dermatologue qualifié. Les données sont hébergées de manière sécurisée et conforme HDS. Durée de conservation : 12 mois.
                  </Label>
                </div>
              </div>

              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-green-900 font-medium">Engagement délai</p>
                    <p className="text-sm text-green-800">Vous recevrez l'avis dermatologique par email sous <strong>4 à 5 jours</strong>.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8 gap-4">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Précédent
            </Button>

            {currentStep < totalSteps - 1 ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                style={{ backgroundColor: '#1a3d3d', color: 'white' }}
              >
                Suivant
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!canProceed() || isSubmitting}
                style={{ backgroundColor: '#1a3d3d', color: 'white' }}
              >
                {isSubmitting ? 'Envoi en cours...' : 'Soumettre le dossier'}
                <CheckCircle className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
