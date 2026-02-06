import React from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle, Calendar, Stethoscope, Shield, AlertCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PatientResultStandard() {
  return (
    <div className="min-h-screen bg-green-50">
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
        {/* Success Banner */}
        <Card className="p-6 mb-6 border-green-300 bg-green-100">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-green-800 mb-2">
                Situation non urgente
              </h1>
              <p className="text-green-700">
                D'après vos réponses, votre problème de peau ne semble pas nécessiter une consultation en urgence.
              </p>
            </div>
          </div>
        </Card>

        {/* Recommendation Card */}
        <Card className="p-6 md:p-8 mb-6">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold mb-2" style={{ color: '#1a3d3d' }}>
              Planifiez une consultation
            </h2>
            <p className="text-gray-600">
              Même sans urgence, un avis dermatologique peut vous aider
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
              <Calendar className="mr-2 h-5 w-5" />
              Téléconsulter
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </a>
        </Card>

        {/* Why consult */}
        <Card className="p-6 mb-6">
          <h3 className="font-semibold mb-4" style={{ color: '#1a3d3d' }}>
            Pourquoi consulter un dermatologue ?
          </h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f0f5f0' }}>
                <Stethoscope className="h-4 w-4" style={{ color: '#1a3d3d' }} />
              </div>
              <div>
                <p className="font-medium">Diagnostic précis</p>
                <p className="text-sm text-gray-600">Identifiez la cause exacte de votre problème de peau</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f0f5f0' }}>
                <Shield className="h-4 w-4" style={{ color: '#1a3d3d' }} />
              </div>
              <div>
                <p className="font-medium">Traitement adapté</p>
                <p className="text-sm text-gray-600">Recevez une ordonnance personnalisée si nécessaire</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f0f5f0' }}>
                <CheckCircle className="h-4 w-4" style={{ color: '#1a3d3d' }} />
              </div>
              <div>
                <p className="font-medium">Suivi professionnel</p>
                <p className="text-sm text-gray-600">Bénéficiez de conseils pour prévenir les récidives</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Aggravation Warning */}
        <Card className="p-4 bg-amber-50 border-amber-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">En cas d'aggravation</p>
              <p className="text-sm text-amber-700">
                Si vos symptômes s'aggravent ou si de nouveaux symptômes apparaissent,
                consultez rapidement un médecin.
              </p>
              <a
                href="https://teleconsultation.tessan.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm font-medium mt-2 hover:underline"
                style={{ color: '#1a3d3d' }}
              >
                Consulter maintenant
                <ArrowRight className="ml-1 h-4 w-4" />
              </a>
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
