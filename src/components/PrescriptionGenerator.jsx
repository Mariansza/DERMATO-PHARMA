import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { FileText, Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function PrescriptionGenerator({ caseData, onGenerate }) {
  const [prescriptionText, setPrescriptionText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedHtml, setGeneratedHtml] = useState('');

  const generatePrescription = () => {
    setIsGenerating(true);
    
    const today = new Date();
    const formattedDate = `le ${today.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    })} ${today.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })}`;

    const html = `
      <div style="font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; background: white;">
        <!-- En-tête -->
        <div style="display: flex; justify-content: space-between; margin-bottom: 40px;">
          <div>
            <h1 style="margin: 0; font-size: 24px; font-weight: bold;">Docteur [Nom]</h1>
            <p style="margin: 5px 0; font-size: 14px; text-transform: uppercase;">DERMATOLOGIE</p>
            <p style="margin: 5px 0; font-size: 12px;">[Adresse complète]</p>
            <p style="margin: 5px 0; font-size: 12px;">Rpps: [RPPS]</p>
            <p style="margin: 5px 0; font-size: 12px;">Finess: [FINESS]</p>
            <p style="margin: 5px 0; font-size: 12px;">Numéro de téléphone: [Téléphone]</p>
          </div>
          <div style="text-align: right;">
            <div style="margin-bottom: 10px;">
              <p style="margin: 0; font-weight: bold; font-size: 18px;">RPPS</p>
              <div style="height: 40px; width: 120px; background: #000; margin-left: auto;"></div>
            </div>
            <div>
              <p style="margin: 0; font-weight: bold; font-size: 18px;">Finess</p>
              <div style="height: 40px; width: 120px; background: #000; margin-left: auto;"></div>
            </div>
          </div>
        </div>

        <!-- Date -->
        <div style="text-align: right; margin-bottom: 30px;">
          <p style="font-size: 14px;">${formattedDate}</p>
        </div>

        <!-- Info Patient -->
        <div style="margin-bottom: 30px;">
          <p style="font-size: 14px; margin: 5px 0;">
            <strong>Pour ${caseData.patient_ref}</strong> Né(e) le ${caseData.patient_birthdate || '[Date de naissance]'}
          </p>
          <p style="font-size: 12px; margin: 5px 0;">Mail: [email du patient]</p>
          <p style="font-size: 12px; margin: 5px 0;">Allergies : [Allergies connues ou "Aucune allergie connue"]</p>
        </div>

        <!-- Prescription -->
        <div style="margin-bottom: 30px; padding: 20px; background: #f9f9f9; border-left: 4px solid #1a3d3d;">
          <div style="white-space: pre-wrap; font-size: 13px; line-height: 1.6;">${prescriptionText}</div>
        </div>

        <p style="font-size: 12px; margin: 20px 0;">
          <strong>Nombre de médicaments prescrits : [Nombre]</strong>
        </p>

        <!-- Signature -->
        <div style="text-align: right; margin: 40px 0;">
          <p style="font-weight: bold;">Dr. [Nom]</p>
          <div style="margin: 20px 0;">
            <!-- Espace pour signature -->
            <div style="height: 80px;"></div>
          </div>
        </div>

        <!-- Conseils -->
        <div style="border-top: 1px solid #ccc; padding-top: 20px; margin-top: 40px; color: #666; font-size: 11px;">
          <p style="margin: 5px 0;">Il est conseillé de solliciter un avis complémentaire pour réévaluation si le problème devait persister.</p>
          <p style="margin: 5px 0;">En cas d'aggravation ressentie, consultez un service d'urgence.</p>
        </div>

        <!-- Footer -->
        <div style="border: 2px solid #000; padding: 15px; margin-top: 30px; display: flex; justify-content: space-between; align-items: center;">
          <div style="flex: 1;">
            <p style="margin: 0; font-size: 12px;">
              <strong>Votre ordonnance vous a été générée par Tessan Med</strong>
            </p>
            <p style="margin: 5px 0 0 0; font-size: 10px; font-style: italic;">
              Avant de délivrer cette ordonnance, vous pouvez vérifier si elle n'a pas déjà été traitée, grâce à ce QR Code.
            </p>
          </div>
          <div style="width: 80px; height: 80px; background: #000; flex-shrink: 0; margin-left: 20px;"></div>
        </div>

        <p style="text-align: right; font-size: 10px; color: #999; margin-top: 10px;">1 / 1</p>
      </div>
    `;

    setGeneratedHtml(html);
    setIsGenerating(false);
    
    if (onGenerate) {
      onGenerate(prescriptionText);
    }
  };

  const downloadPDF = async () => {
    const element = document.getElementById('prescription-preview');
    if (!element) return;

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
    const imgX = (pdfWidth - imgWidth * ratio) / 2;
    const imgY = 0;

    pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
    pdf.save(`Ordonnance_${caseData.public_reference}.pdf`);
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-xl font-bold mb-4" style={{ color: '#1a3d3d' }}>
          Génération d'ordonnance
        </h3>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="prescription">Contenu de l'ordonnance</Label>
            <Textarea
              id="prescription"
              value={prescriptionText}
              onChange={(e) => setPrescriptionText(e.target.value)}
              placeholder="Exemple :&#10;&#10;Paracétamol 300 mg poudre pour solution buvable en sachet&#10;1 mg 1 fois par jour le matin du 09-01-2026 au 09-01-2026, par voie orale.&#10;&#10;Crème hydrocortisone 1%&#10;Appliquer 2 fois par jour sur les zones affectées pendant 7 jours"
              className="min-h-64 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-2">
              Saisissez les médicaments, posologies et instructions d'utilisation
            </p>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={generatePrescription}
              disabled={!prescriptionText || isGenerating}
              style={{ backgroundColor: '#1a3d3d', color: 'white' }}
            >
              <FileText className="h-4 w-4 mr-2" />
              Générer l'aperçu
            </Button>

            {generatedHtml && (
              <Button 
                onClick={downloadPDF}
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                Télécharger PDF
              </Button>
            )}
          </div>
        </div>
      </Card>

      {generatedHtml && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Aperçu de l'ordonnance</h3>
          <div 
            id="prescription-preview"
            dangerouslySetInnerHTML={{ __html: generatedHtml }}
            className="border rounded-lg overflow-auto"
            style={{ maxHeight: '800px' }}
          />
        </Card>
      )}
    </div>
  );
}