import React from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertTriangle, Clock, Stethoscope, Shield, Phone, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PatientResultUrgent() {
  return (
    <div className="min-h-screen bg-orange-50">
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
      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Alert Banner */}
        <Card className="p-6 mb-6 border-orange-300 bg-orange-100">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-orange-800 mb-2">
                Consultation recommandée rapidement
              </h1>
              <p className="text-orange-700">
                D'après vos réponses, votre situation nécessite une consultation dermatologique dans les prochains jours.
              </p>
            </div>
          </div>
        </Card>

        {/* CTA Card */}
        <Card className="p-6 md:p-8 mb-6">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold mb-2" style={{ color: '#1a3d3d' }}>
              Téléconsultez un dermatologue maintenant
            </h2>
            <p className="text-gray-600">
              Disponible 7j/7 - Réponse rapide
            </p>
          </div>

          <a
            href="https://teleconsultation.tessan.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <Button
              className="w-full py-4 text-lg rounded-full shadow-lg hover:shadow-xl transition-all"
              style={{ backgroundColor: '#1a3d3d', color: 'white' }}
            >
              <Stethoscope className="mr-2 h-5 w-5" />
              Téléconsulter maintenant
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </a>
        </Card>

        {/* Benefits */}
        <Card className="p-6 mb-6">
          <h3 className="font-semibold mb-4" style={{ color: '#1a3d3d' }}>
            Pourquoi téléconsulter rapidement ?
          </h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f0f5f0' }}>
                <Clock className="h-4 w-4" style={{ color: '#1a3d3d' }} />
              </div>
              <div>
                <p className="font-medium">Diagnostic rapide</p>
                <p className="text-sm text-gray-600">Obtenez un avis médical sous 24h</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f0f5f0' }}>
                <Stethoscope className="h-4 w-4" style={{ color: '#1a3d3d' }} />
              </div>
              <div>
                <p className="font-medium">Dermatologue qualifié</p>
                <p className="text-sm text-gray-600">Spécialiste diplômé et expérimenté</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f0f5f0' }}>
                <Shield className="h-4 w-4" style={{ color: '#1a3d3d' }} />
              </div>
              <div>
                <p className="font-medium">Ordonnance si nécessaire</p>
                <p className="text-sm text-gray-600">Traitement adapté délivré directement</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Emergency Warning */}
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-center gap-3">
            <Phone className="h-5 w-5 text-red-600" />
            <div>
              <p className="font-medium text-red-800">En cas d'urgence vitale</p>
              <p className="text-sm text-red-700">
                Appelez le <strong>15</strong> (SAMU) ou rendez-vous aux urgences
              </p>
            </div>
          </div>
        </Card>

        {/* Footer links */}
        <div className="mt-8 text-center">
          <Link to="/patient" className="text-gray-500 hover:text-gray-700 text-sm">
            Refaire une évaluation
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 mt-8">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <p className="text-xs text-gray-500">
            Cette évaluation ne remplace pas un diagnostic médical.
            Les informations fournies sont indicatives et ne constituent pas un avis médical.
          </p>
        </div>
      </footer>
    </div>
  );
}
