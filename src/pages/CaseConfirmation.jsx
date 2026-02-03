import React from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle, Clock, Mail, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function CaseConfirmation() {
  const urlParams = new URLSearchParams(window.location.search);
  const reference = urlParams.get('ref') || 'N/A';

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-50 py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <Card className="p-12 shadow-xl text-center">
          <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>

          <h1 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#1a3d3d' }}>
            Dossier bien reçu !
          </h1>

          <div className="inline-block px-6 py-3 rounded-lg mb-6" style={{ backgroundColor: '#f0f5f0' }}>
            <p className="text-sm text-gray-600 mb-1">Référence de votre dossier</p>
            <p className="text-2xl font-bold" style={{ color: '#1a3d3d' }}>{reference}</p>
          </div>

          <p className="text-lg text-gray-700 mb-8">
            Votre demande de téléexpertise dermatologique a été enregistrée avec succès.
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card className="p-6 text-left">
              <Clock className="h-8 w-8 mb-3" style={{ color: '#1a3d3d' }} />
              <h3 className="font-semibold mb-2">Délai de réponse</h3>
              <p className="text-sm text-gray-600">
                Vous recevrez l'avis du dermatologue par email sous <strong>4 à 5 jours</strong>
              </p>
            </Card>

            <Card className="p-6 text-left">
              <Mail className="h-8 w-8 mb-3" style={{ color: '#1a3d3d' }} />
              <h3 className="font-semibold mb-2">Accusé de réception</h3>
              <p className="text-sm text-gray-600">
                Un email de confirmation vous a été envoyé avec votre numéro de dossier
              </p>
            </Card>
          </div>

          <div className="p-6 bg-blue-50 rounded-lg border border-blue-200 text-left mb-8">
            <div className="flex gap-3">
              <FileText className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Prochaines étapes</h3>
                <ol className="text-sm text-blue-800 space-y-2">
                  <li><strong>1.</strong> Votre dossier sera qualifié par notre équipe</li>
                  <li><strong>2.</strong> Un dermatologue expert analysera les photos et le contexte clinique</li>
                  <li><strong>3.</strong> Vous recevrez un avis structuré avec recommandations</li>
                  <li><strong>4.</strong> Vous pourrez accompagner votre patient avec ces éléments</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-gray-600 mb-4">
              Conservez votre numéro de référence : <strong>{reference}</strong>
            </p>
            <Link to={createPageUrl('Home')}>
              <Button size="lg" style={{ backgroundColor: '#1a3d3d', color: 'white' }}>
                Retour à l'accueil
              </Button>
            </Link>
          </div>
        </Card>

        <div className="text-center mt-6 text-sm text-gray-600">
          <p>Une question ? Contactez-nous à <a href="mailto:support@tessan.io" className="underline">support@tessan.io</a></p>
        </div>
      </div>
    </div>
  );
}