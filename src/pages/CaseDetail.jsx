import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, User, FileText, Camera, Clock, AlertCircle, Download, Send, Save } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function CaseDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const caseId = urlParams.get('id');
  const queryClient = useQueryClient();

  const [currentUser, setCurrentUser] = useState(null);
  const [opinion, setOpinion] = useState({});
  const [prescriptionText, setPrescriptionText] = useState('');
  const [reportText, setReportText] = useState('');
  const [prescriptionHtml, setPrescriptionHtml] = useState('');
  const [reportHtml, setReportHtml] = useState('');
  const [isGeneratingPrescription, setIsGeneratingPrescription] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isSavingDoctorInfo, setIsSavingDoctorInfo] = useState(false);
  const [doctorInfo, setDoctorInfo] = useState({
    firstName: '',
    lastName: '',
    rpps: '',
    signature: ''
  });

  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        if (user.first_name || user.last_name || user.rpps || user.signature) {
          setDoctorInfo({
            firstName: user.first_name || '',
            lastName: user.last_name || '',
            rpps: user.rpps || '',
            signature: user.signature || ''
          });
        }
      } catch (error) {
        console.error('Error loading user info:', error);
      }
    };
    loadUserInfo();
  }, []);

  const { data: caseData, isLoading: caseLoading } = useQuery({
    queryKey: ['case', caseId],
    queryFn: async () => {
      const cases = await base44.entities.Case.list();
      return cases.find(c => c.id === caseId);
    },
    enabled: !!caseId
  });

  const { data: photos = [] } = useQuery({
    queryKey: ['photos', caseId],
    queryFn: () => base44.entities.Photo.filter({ case_id: caseId }),
    enabled: !!caseId
  });

  const { data: opinions = [] } = useQuery({
    queryKey: ['opinions', caseId],
    queryFn: () => base44.entities.MedicalOpinion.filter({ case_id: caseId }),
    enabled: !!caseId
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['audit', caseId],
    queryFn: () => base44.entities.AuditLog.filter({ case_id: caseId }, '-created_date'),
    enabled: !!caseId
  });

  const concludeCaseMutation = useMutation({
    mutationFn: async () => {
      const updateData = {
        status: 'Terminé',
        closed_at: new Date().toISOString(),
        assigned_derm_id: currentUser.id,
        assigned_derm_name: currentUser.full_name || `${currentUser.first_name} ${currentUser.last_name}`
      };
      
      await base44.entities.Case.update(caseId, updateData);
      
      await base44.entities.AuditLog.create({
        actor_type: 'derm',
        actor_id: currentUser?.id || 'unknown',
        actor_name: currentUser?.full_name || currentUser?.email || 'Médecin',
        case_id: caseId,
        action: 'case_concluded',
        details: 'Dossier conclu'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['case', caseId]);
      queryClient.invalidateQueries(['audit', caseId]);
      queryClient.invalidateQueries(['cases']);
      alert('Le dossier a été conclu avec succès');
    }
  });

  const saveOpinionMutation = useMutation({
    mutationFn: async (opinionData) => {
      const existing = opinions[0];
      if (existing) {
        return await base44.entities.MedicalOpinion.update(existing.id, opinionData);
      } else {
        return await base44.entities.MedicalOpinion.create({
          ...opinionData,
          case_id: caseId
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['opinions', caseId]);
      alert('Avis sauvegardé');
    }
  });

  const handleConcludeCase = async () => {
    if (!currentUser) {
      alert('Erreur: utilisateur non identifié');
      return;
    }

    if (!prescriptionHtml || !reportHtml) {
      alert('Veuillez générer l\'ordonnance et le compte rendu avant de conclure le dossier.');
      return;
    }

    // Passer le statut à "En cours" si c'est le premier traitement
    if (caseData.status === 'En attente') {
      await base44.entities.Case.update(caseId, {
        status: 'En cours',
        assigned_derm_id: currentUser.id,
        assigned_derm_name: currentUser.full_name || `${currentUser.first_name} ${currentUser.last_name}`
      });
    }

    const confirmText = 'Êtes-vous sûr de vouloir conclure ce dossier ? L\'ordonnance et le compte rendu seront envoyés au patient par email.';
    if (window.confirm(confirmText)) {
      // Générer et uploader les PDFs avant de conclure
      try {
        // Générer PDF ordonnance
        const prescriptionElement = document.getElementById('prescription-preview');
        const prescriptionCanvas = await html2canvas(prescriptionElement, { scale: 2 });
        const prescriptionImgData = prescriptionCanvas.toDataURL('image/png');
        const prescriptionPdf = new jsPDF('p', 'mm', 'a4');
        const prescriptionImgWidth = 210;
        const prescriptionImgHeight = (prescriptionCanvas.height * prescriptionImgWidth) / prescriptionCanvas.width;
        prescriptionPdf.addImage(prescriptionImgData, 'PNG', 0, 0, prescriptionImgWidth, prescriptionImgHeight);
        const prescriptionBlob = prescriptionPdf.output('blob');
        const prescriptionFile = new File([prescriptionBlob], `ordonnance_${caseData.public_reference}.pdf`, { type: 'application/pdf' });

        // Générer PDF compte rendu
        const reportElement = document.getElementById('report-preview');
        const reportCanvas = await html2canvas(reportElement, { scale: 2 });
        const reportImgData = reportCanvas.toDataURL('image/png');
        const reportPdf = new jsPDF('p', 'mm', 'a4');
        const reportImgWidth = 210;
        const reportImgHeight = (reportCanvas.height * reportImgWidth) / reportCanvas.width;
        reportPdf.addImage(reportImgData, 'PNG', 0, 0, reportImgWidth, reportImgHeight);
        const reportBlob = reportPdf.output('blob');
        const reportFile = new File([reportBlob], `compte_rendu_${caseData.public_reference}.pdf`, { type: 'application/pdf' });

        // Uploader les fichiers
        const prescriptionUpload = await base44.integrations.Core.UploadFile({ file: prescriptionFile });
        const reportUpload = await base44.integrations.Core.UploadFile({ file: reportFile });

        // Mettre à jour le dossier avec tous les champs en une seule opération
        await base44.entities.Case.update(caseId, {
          status: 'Terminé',
          closed_at: new Date().toISOString(),
          assigned_derm_id: currentUser.id,
          assigned_derm_name: currentUser.full_name || `${currentUser.first_name} ${currentUser.last_name}`,
          prescription_url: prescriptionUpload.file_url,
          report_url: reportUpload.file_url
        });

        // Log d'audit
        await base44.entities.AuditLog.create({
          actor_type: 'derm',
          actor_id: currentUser?.id || 'unknown',
          actor_name: currentUser?.full_name || currentUser?.email || 'Médecin',
          case_id: caseId,
          action: 'case_concluded',
          details: 'Dossier conclu'
        });

        // Invalider les caches
        queryClient.invalidateQueries(['case', caseId]);
        queryClient.invalidateQueries(['cases']);
        queryClient.invalidateQueries(['audit', caseId]);

        // Envoyer l'email au patient
        const emailBody = `
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
<p>Bonjour ${caseData.patient_first_name} ${caseData.patient_last_name},</p>

<p>Votre demande de télé-expertise dermatologique (référence: <strong>${caseData.public_reference}</strong>) a été traitée.<br/>
Vous trouverez ci-dessous les liens pour télécharger vos documents :</p>

<p style="margin: 20px 0;">
<a href="${prescriptionUpload.file_url}" target="_blank" rel="noopener noreferrer" style="color: #1a3d3d; text-decoration: none; font-weight: bold;">📄 Télécharger l'ordonnance</a>
</p>

<p style="margin: 20px 0;">
<a href="${reportUpload.file_url}" target="_blank" rel="noopener noreferrer" style="color: #1a3d3d; text-decoration: none; font-weight: bold;">📄 Télécharger le compte rendu médical</a>
</p>

<p>Ces documents restent accessibles pendant 90 jours.<br/>
Pour toute question, veuillez contacter votre pharmacie : ${caseData.pharmacy_name} (${caseData.pharmacy_city}).</p>

<p style="margin: 20px 0; padding: 15px; background: #f0f5f0; border-left: 3px solid #1a3d3d;">
<strong>Liens utiles :</strong><br/>
🏥 <a href="https://teleconsultation.tessan.io/" style="color: #1a3d3d; text-decoration: none;">Trouver une pharmacie partenaire</a><br/>
👤 <a href="https://patient.prod.tessan.cloud/signup" style="color: #1a3d3d; text-decoration: none;">Créer un compte patient</a>
</p>

<p>Cordialement,<br/>
Dr. ${doctorInfo.firstName} ${doctorInfo.lastName}<br/>
<em>Service de Télé-expertise Dermatologique</em></p>
</body>
</html>
        `.trim();

        await base44.integrations.Core.SendEmail({
          from_name: `Dr. ${doctorInfo.firstName} ${doctorInfo.lastName}`,
          to: caseData.patient_email,
          subject: `Votre avis dermatologique - ${caseData.public_reference}`,
          body: emailBody
        });

        alert('Dossier conclu avec succès. Un email a été envoyé au patient avec les documents.');
      } catch (error) {
        console.error('Erreur lors de la conclusion:', error);
        alert('Erreur lors de l\'envoi de l\'email. Le dossier n\'a pas été conclu.');
      }
    }
  };

  const handleSaveOpinion = () => {
    saveOpinionMutation.mutate({
      ...opinion,
      signed_at: new Date().toISOString()
    });
  };

  const handleSaveDoctorInfo = async () => {
    if (!doctorInfo.firstName || !doctorInfo.lastName || !doctorInfo.rpps) {
      alert('Veuillez remplir tous les champs obligatoires (Prénom, Nom, RPPS)');
      return;
    }

    setIsSavingDoctorInfo(true);
    try {
      await base44.auth.updateMe({
        first_name: doctorInfo.firstName,
        last_name: doctorInfo.lastName,
        rpps: doctorInfo.rpps,
        signature: doctorInfo.signature
      });
      alert('Vos informations ont été sauvegardées avec succès');
    } catch (error) {
      alert('Erreur lors de la sauvegarde: ' + error.message);
    } finally {
      setIsSavingDoctorInfo(false);
    }
  };

  const generatePrescription = () => {
    if (!prescriptionText.trim() || !doctorInfo.firstName || !doctorInfo.lastName || !doctorInfo.rpps || !doctorInfo.signature) {
      alert('Veuillez remplir tous les champs obligatoires (y compris la signature)');
      return;
    }

    setIsGeneratingPrescription(true);

    const currentDate = new Date().toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

    const html = `
      <div style="font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; background: white;">
        <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1a3d3d; padding-bottom: 20px;">
          <h1 style="color: #1a3d3d; margin: 0 0 10px 0; font-size: 28px;">ORDONNANCE</h1>
        </div>

        <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
          <div style="flex: 1;">
            <p style="margin: 0; font-size: 14px; line-height: 1.6;">
              <strong>Dr. ${doctorInfo.firstName} ${doctorInfo.lastName}</strong><br/>
              Spécialité : Dermatologue<br/>
              RPPS: ${doctorInfo.rpps}<br/>
              FINESS: 7 50 07 58 14<br/>
              Téléphone: 01 86 26 51 77<br/>
              Tessan MED<br/>
              25 Rue de Ponthieu<br/>
              75008 Paris, France
            </p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 0; font-size: 14px; color: #666;">
              Paris, le ${currentDate}
            </p>
          </div>
        </div>

        <div style="margin-bottom: 30px; padding: 20px; background: #f9f9f9; border-left: 4px solid #1a3d3d;">
          <p style="margin: 0 0 5px 0; font-size: 14px; color: #666;">Patient:</p>
          <p style="margin: 0; font-size: 16px;"><strong>${caseData.patient_first_name} ${caseData.patient_last_name}</strong></p>
          ${caseData.patient_ssn ? `<p style="margin: 5px 0 0 0; font-size: 14px; color: #666;">N° SS: ${caseData.patient_ssn}</p>` : ''}
          ${caseData.patient_birthdate ? `<p style="margin: 5px 0 0 0; font-size: 14px; color: #666;">Date de naissance: ${caseData.patient_birthdate}</p>` : ''}
        </div>

        <div style="margin-bottom: 40px; padding: 20px; background: white; border: 1px solid #ddd; min-height: 200px;">
          <p style="white-space: pre-wrap; line-height: 1.8; font-size: 15px; margin: 0;">${prescriptionText}</p>
        </div>

        <div style="margin-top: 50px; text-align: right;">
          <p style="margin: 0; font-size: 14px;">Signature du médecin</p>
          <p style="margin: 20px 0; font-size: 24px; font-family: 'Brush Script MT', cursive; font-style: italic;">${doctorInfo.signature}</p>
          <div style="border-top: 1px solid #000; width: 200px; margin: 10px 0 0 auto;"></div>
          <p style="margin: 10px 0 0 0; font-size: 12px;">Dr. ${doctorInfo.firstName} ${doctorInfo.lastName}</p>
        </div>
      </div>
    `;

    setPrescriptionHtml(html);
    setIsGeneratingPrescription(false);
  };

  const generateReport = () => {
    if (!reportText.trim() || !doctorInfo.firstName || !doctorInfo.lastName || !doctorInfo.rpps || !doctorInfo.signature) {
      alert('Veuillez remplir tous les champs obligatoires (y compris la signature)');
      return;
    }

    setIsGeneratingReport(true);

    const currentDate = new Date().toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

    const html = `
      <div style="font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; background: white;">
        <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1a3d3d; padding-bottom: 20px;">
          <h1 style="color: #1a3d3d; margin: 0 0 10px 0; font-size: 28px;">COMPTE RENDU MÉDICAL</h1>
        </div>

        <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
          <div style="flex: 1;">
            <p style="margin: 0; font-size: 14px; line-height: 1.6;">
              <strong>Dr. ${doctorInfo.firstName} ${doctorInfo.lastName}</strong><br/>
              Spécialité : Dermatologue<br/>
              RPPS: ${doctorInfo.rpps}<br/>
              FINESS: 7 50 07 58 14<br/>
              Téléphone: 01 86 26 51 77<br/>
              Tessan MED<br/>
              25 Rue de Ponthieu<br/>
              75008 Paris, France
            </p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 0; font-size: 14px; color: #666;">
              Paris, le ${currentDate}
            </p>
          </div>
        </div>

        <div style="margin-bottom: 20px; padding: 15px; background: #f0f5f0; border-left: 4px solid #1a3d3d;">
          <p style="margin: 0 0 5px 0; font-size: 12px; color: #666;">Dossier:</p>
          <p style="margin: 0; font-size: 14px;"><strong>${caseData.public_reference}</strong></p>
        </div>

        <div style="margin-bottom: 20px; padding: 15px; background: #f9f9f9; border-left: 4px solid #1a3d3d;">
          <p style="margin: 0 0 5px 0; font-size: 12px; color: #666;">Patient:</p>
          <p style="margin: 0; font-size: 14px;"><strong>${caseData.patient_first_name} ${caseData.patient_last_name}</strong></p>
          ${caseData.patient_ssn ? `<p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">N° SS: ${caseData.patient_ssn}</p>` : ''}
          ${caseData.patient_birthdate ? `<p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">Date de naissance: ${caseData.patient_birthdate}</p>` : ''}
        </div>

        <div style="margin-bottom: 40px; padding: 20px; background: white; border: 1px solid #ddd; min-height: 300px;">
          <p style="white-space: pre-wrap; line-height: 1.8; font-size: 15px; margin: 0;">${reportText}</p>
        </div>

        <div style="margin-top: 50px; text-align: right;">
          <p style="margin: 0; font-size: 14px;">Signature du médecin</p>
          <p style="margin: 20px 0; font-size: 24px; font-family: 'Brush Script MT', cursive; font-style: italic;">${doctorInfo.signature}</p>
          <div style="border-top: 1px solid #000; width: 200px; margin: 10px 0 0 auto;"></div>
          <p style="margin: 10px 0 0 0; font-size: 12px;">Dr. ${doctorInfo.firstName} ${doctorInfo.lastName}</p>
        </div>
      </div>
    `;

    setReportHtml(html);
    setIsGeneratingReport(false);
  };

  const downloadPrescriptionPdf = async () => {
    const element = document.getElementById('prescription-preview');
    if (!element) return;

    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    pdf.save(`ordonnance_${caseData.public_reference}.pdf`);
  };

  const downloadReportPdf = async () => {
    const element = document.getElementById('report-preview');
    if (!element) return;

    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    pdf.save(`compte_rendu_${caseData.public_reference}.pdf`);
  };

  if (caseLoading || !caseData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Clock className="h-8 w-8 animate-spin" style={{ color: '#1a3d3d' }} />
      </div>
    );
  }

  const currentOpinion = opinions[0];
  const sla = caseData.sla_due_at ? new Date(caseData.sla_due_at) : null;
  const now = new Date();
  const slaExpired = sla && sla < now && caseData.status !== 'Terminé';

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('Dashboard')}>
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold" style={{ color: '#1a3d3d' }}>
                {caseData.public_reference}
              </h1>
              <p className="text-gray-600">
                Soumis le {new Date(caseData.created_date).toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={`text-lg px-4 py-2 ${
              caseData.status === 'En attente' ? 'bg-blue-100 text-blue-800' :
              caseData.status === 'Terminé' ? 'bg-green-100 text-green-800' :
              'bg-purple-100 text-purple-800'
            }`}>
              {caseData.status}
            </Badge>
            {slaExpired && (
              <Badge className="bg-red-100 text-red-800 text-lg px-4 py-2">
                SLA dépassé
              </Badge>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="info">
              <TabsList>
                <TabsTrigger value="info">Informations</TabsTrigger>
                <TabsTrigger value="photos">Photos ({photos.length})</TabsTrigger>
                <TabsTrigger value="avis">Avis médical</TabsTrigger>
                <TabsTrigger value="historique">Historique</TabsTrigger>
              </TabsList>

              <TabsContent value="info">
                <Card className="p-6">
                  <h2 className="text-xl font-bold mb-4" style={{ color: '#1a3d3d' }}>Informations du dossier</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2 flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Pharmacien
                      </h3>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="font-medium">{caseData.pharmacist_name}</p>
                        <p className="text-sm text-gray-600">{caseData.pharmacy_name}</p>
                        <p className="text-sm text-gray-600">{caseData.pharmacy_city}</p>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">Patient</h3>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p><strong>Nom:</strong> {caseData.patient_first_name} {caseData.patient_last_name}</p>
                        {caseData.patient_ssn && <p><strong>N° SS:</strong> {caseData.patient_ssn}</p>}
                        {caseData.patient_birthdate && <p><strong>Date de naissance:</strong> {caseData.patient_birthdate}</p>}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">Contexte clinique</h3>
                      <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                        <p><strong>Localisation:</strong> {caseData.anatomical_location}</p>
                        <p><strong>Durée:</strong> {caseData.duration || 'Non spécifiée'}</p>
                        <p><strong>Symptômes:</strong> {caseData.symptoms || 'Non spécifiés'}</p>
                        <p><strong>Urgence perçue:</strong> <span className={
                          caseData.perceived_urgency === 'Élevée' ? 'text-red-600 font-semibold' :
                          caseData.perceived_urgency === 'Modérée' ? 'text-orange-600 font-semibold' :
                          'text-green-600'
                        }>{caseData.perceived_urgency}</span></p>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">Description détaillée</h3>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        {(() => {
                          try {
                            const parsed = JSON.parse(caseData.clinical_description);
                            const labels = {
                              symptomes: "Symptômes",
                              duree_probleme: "Durée du problème",
                              recurrence: "Récurrence",
                              traitement_actuel: "Traitement actuel",
                              nouveau_medicament: "Nouveau médicament",
                              antecedents_derm: "Antécédents dermatologiques",
                              grains_beaute: "Grains de beauté",
                              changements_grains: "Changements grains de beauté",
                              qualite_vie: "Impact qualité de vie"
                            };
                            return (
                              <ul className="text-sm space-y-2">
                                {Object.entries(parsed).map(([key, value]) => (
                                  <li key={key} className="flex items-start gap-2">
                                    <span className="text-gray-600">•</span>
                                    <span>
                                      <strong>{labels[key] || key}:</strong>{' '}
                                      {Array.isArray(value) ? value.join(', ') : value}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            );
                          } catch {
                            return <p className="text-sm whitespace-pre-wrap">{caseData.clinical_description}</p>;
                          }
                        })()}
                      </div>
                    </div>

                    {caseData.prior_treatments && (
                      <div>
                        <h3 className="font-semibold mb-2">Traitements antérieurs</h3>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <p className="text-sm whitespace-pre-wrap">{caseData.prior_treatments}</p>
                        </div>
                      </div>
                    )}

                    {caseData.risk_factors && (
                      <div>
                        <h3 className="font-semibold mb-2">Facteurs de risque</h3>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <p className="text-sm whitespace-pre-wrap">{caseData.risk_factors}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="photos">
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold" style={{ color: '#1a3d3d' }}>Photos</h2>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Télécharger tout
                    </Button>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    {photos.map((photo) => (
                      <div key={photo.id} className="border rounded-lg overflow-hidden">
                        <img src={photo.file_url} alt={photo.photo_type} className="w-full h-64 object-cover" />
                        <div className="p-3 bg-gray-50">
                          <p className="font-medium text-sm">{photo.photo_type}</p>
                          <p className="text-xs text-gray-600">
                            {photo.exif_stripped && '🔒 EXIF supprimées'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="avis">
                <Card className="p-6">
                  <h2 className="text-xl font-bold mb-4" style={{ color: '#1a3d3d' }}>Avis médical & Documents</h2>

                  {currentOpinion && currentOpinion.sent_to_pharmacist ? (
                    <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-sm text-green-800">
                        ✅ Avis envoyé au pharmacien le {new Date(currentOpinion.sent_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  ) : null}

                  {/* Si le dossier est terminé, afficher uniquement les documents */}
                  {caseData.status === 'Terminé' ? (
                    <div className="space-y-6">
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-sm text-green-800 mb-2">✅ Dossier conclu le {caseData.closed_at ? new Date(caseData.closed_at).toLocaleDateString('fr-FR') : '-'}</p>
                        <p className="text-xs text-gray-600">Médecin: {caseData.assigned_derm_name}</p>
                      </div>

                      {/* Ordonnance */}
                      <div className="border rounded-lg p-4">
                        <h3 className="text-lg font-bold mb-3" style={{ color: '#1a3d3d' }}>📄 Ordonnance</h3>
                        {caseData.prescription_url ? (
                          <a href={caseData.prescription_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline">
                              <Download className="h-4 w-4 mr-2" />
                              Télécharger l'ordonnance
                            </Button>
                          </a>
                        ) : (
                          <p className="text-sm text-gray-500">Aucune ordonnance disponible</p>
                        )}
                      </div>

                      {/* Compte Rendu */}
                      <div className="border rounded-lg p-4">
                        <h3 className="text-lg font-bold mb-3" style={{ color: '#1a3d3d' }}>📄 Compte Rendu Médical</h3>
                        {caseData.report_url ? (
                          <a href={caseData.report_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline">
                              <Download className="h-4 w-4 mr-2" />
                              Télécharger le compte rendu
                            </Button>
                          </a>
                        ) : (
                          <p className="text-sm text-gray-500">Aucun compte rendu disponible</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                  {/* Informations du médecin */}
                  <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h3 className="font-semibold mb-3" style={{ color: '#1a3d3d' }}>Informations du médecin</h3>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <Label>Prénom *</Label>
                        <Input
                          value={doctorInfo.firstName}
                          onChange={(e) => setDoctorInfo({...doctorInfo, firstName: e.target.value})}
                          placeholder="Prénom"
                        />
                      </div>
                      <div>
                        <Label>Nom *</Label>
                        <Input
                          value={doctorInfo.lastName}
                          onChange={(e) => setDoctorInfo({...doctorInfo, lastName: e.target.value})}
                          placeholder="Nom"
                        />
                      </div>
                      <div>
                        <Label>RPPS *</Label>
                        <Input
                          value={doctorInfo.rpps}
                          onChange={(e) => setDoctorInfo({...doctorInfo, rpps: e.target.value})}
                          placeholder="Numéro RPPS"
                        />
                      </div>
                    </div>
                    <div className="mt-4">
                      <Label>Signature (texte) *</Label>
                      <Input
                        value={doctorInfo.signature}
                        onChange={(e) => setDoctorInfo({...doctorInfo, signature: e.target.value})}
                        placeholder="Votre signature manuscrite"
                        className="font-cursive"
                      />
                      <p className="text-xs text-gray-600 mt-1">Saisissez votre signature telle qu'elle apparaîtra sur les documents</p>
                    </div>
                    <div className="mt-4">
                      <Button 
                        onClick={handleSaveDoctorInfo}
                        disabled={isSavingDoctorInfo || !doctorInfo.firstName || !doctorInfo.lastName || !doctorInfo.rpps}
                        variant="outline"
                        className="w-full"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {isSavingDoctorInfo ? 'Sauvegarde...' : 'Sauvegarder mes informations'}
                      </Button>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">
                      FINESS: 7 50 07 58 14 • Tél: 01 86 26 51 77 • 25 Rue de Ponthieu, 75008 Paris
                    </p>
                  </div>



                  {/* Ordonnance */}
                  <div className="mt-8 pt-8 border-t">
                   <h3 className="text-lg font-bold mb-4" style={{ color: '#1a3d3d' }}>Ordonnance</h3>
                   <div className="space-y-4">
                     <div>
                        <Label>Contenu de l'ordonnance</Label>
                        <Textarea
                          value={prescriptionText}
                          onChange={(e) => setPrescriptionText(e.target.value)}
                          placeholder="Saisissez le contenu de l'ordonnance..."
                          className="min-h-32"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={generatePrescription}
                          disabled={isGeneratingPrescription || !prescriptionText.trim() || !doctorInfo.firstName || !doctorInfo.lastName || !doctorInfo.rpps || !doctorInfo.signature}
                          style={{ backgroundColor: '#1a3d3d', color: 'white' }}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          {isGeneratingPrescription ? 'Génération...' : 'Générer l\'ordonnance'}
                        </Button>
                        {prescriptionHtml && (
                          <Button onClick={downloadPrescriptionPdf} variant="outline">
                            <Download className="h-4 w-4 mr-2" />
                            Télécharger PDF
                          </Button>
                        )}
                      </div>
                      {prescriptionHtml && (
                        <div className="mt-4">
                          <h4 className="font-semibold mb-2">Aperçu de l'ordonnance</h4>
                          <div 
                            id="prescription-preview"
                            className="border rounded-lg p-4 bg-white shadow-sm"
                            dangerouslySetInnerHTML={{ __html: prescriptionHtml }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Compte Rendu */}
                  <div className="mt-8 pt-8 border-t">
                    <h3 className="text-lg font-bold mb-4" style={{ color: '#1a3d3d' }}>Compte Rendu Médical</h3>
                    <div className="space-y-4">
                      <div>
                        <Label>Contenu du compte rendu</Label>
                        <Textarea
                          value={reportText}
                          onChange={(e) => setReportText(e.target.value)}
                          placeholder="Saisissez le contenu du compte rendu médical..."
                          className="min-h-32"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={generateReport}
                          disabled={isGeneratingReport || !reportText.trim() || !doctorInfo.firstName || !doctorInfo.lastName || !doctorInfo.rpps || !doctorInfo.signature}
                          style={{ backgroundColor: '#1a3d3d', color: 'white' }}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          {isGeneratingReport ? 'Génération...' : 'Générer le compte rendu'}
                        </Button>
                        {reportHtml && (
                          <Button onClick={downloadReportPdf} variant="outline">
                            <Download className="h-4 w-4 mr-2" />
                            Télécharger PDF
                          </Button>
                        )}
                      </div>
                      {reportHtml && (
                        <div className="mt-4">
                          <h4 className="font-semibold mb-2">Aperçu du compte rendu</h4>
                          <div 
                            id="report-preview"
                            className="border rounded-lg p-4 bg-white shadow-sm"
                            dangerouslySetInnerHTML={{ __html: reportHtml }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bouton Conclure */}
                  <div className="mt-8 pt-8 border-t">
                    {(!prescriptionHtml || !reportHtml) && (
                      <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <p className="text-sm text-amber-800">
                          ⚠️ Veuillez générer l'ordonnance et le compte rendu avant de conclure le dossier
                        </p>
                      </div>
                    )}
                    <Button 
                      onClick={handleConcludeCase}
                      disabled={concludeCaseMutation.isLoading || !prescriptionHtml || !reportHtml}
                      className="w-full"
                      style={{ backgroundColor: '#1a3d3d', color: 'white' }}
                      size="lg"
                    >
                      {concludeCaseMutation.isLoading ? 'Conclusion en cours...' : 'Conclure et envoyer au patient'}
                    </Button>
                    <p className="text-xs text-gray-600 text-center mt-2">
                      Les documents seront envoyés par email au patient
                    </p>
                  </div>
                  </>
                  )}
                </Card>
              </TabsContent>

              <TabsContent value="historique">
                <Card className="p-6">
                  <h2 className="text-xl font-bold mb-4" style={{ color: '#1a3d3d' }}>Historique des actions</h2>
                  <div className="space-y-3">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="flex gap-3 pb-3 border-b last:border-0">
                        <div className="flex-shrink-0 mt-1">
                          <div className="h-2 w-2 rounded-full bg-blue-500" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{log.details}</p>
                          <p className="text-xs text-gray-600">
                            {log.actor_name} • {new Date(log.created_date).toLocaleString('fr-FR')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* SLA */}
            <Card className="p-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Clock className="h-5 w-5" />
                SLA / Délai
              </h3>
              {sla ? (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Échéance</p>
                  <p className={`font-medium ${slaExpired ? 'text-red-600' : 'text-green-600'}`}>
                    {sla.toLocaleString('fr-FR')}
                  </p>
                  {slaExpired && (
                    <p className="text-sm text-red-600 mt-2">⚠️ Délai dépassé</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-600">Aucun SLA défini</p>
              )}
            </Card>


          </div>
        </div>
      </div>
    </div>
  );
}