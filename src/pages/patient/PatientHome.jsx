import React from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Clock, Shield, UserCheck, Stethoscope } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PatientHome() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693829947440887924766fee/bee7f8545_Logo.png"
                alt="Tessan"
                width="91"
                height="20"
                className="h-5"
              />
            </div>
            <a
              href="https://teleconsultation.tessan.io/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm" style={{ borderColor: '#1a3d3d', color: '#1a3d3d' }}>
                Téléconsulter
              </Button>
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-block px-4 py-2 rounded-full text-sm font-semibold mb-6" style={{ backgroundColor: '#f0f5f0', color: '#1a3d3d' }}>
            Évaluation gratuite en 2 minutes
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6" style={{ color: '#1a3d3d' }}>
            Un problème de peau ?
          </h1>
          <p className="text-xl text-gray-600 mb-4 leading-relaxed">
            Évaluez la <strong>gravité de votre problème</strong> dermatologique en quelques questions
          </p>
          <p className="text-lg text-gray-500 mb-8">
            Recevez une orientation personnalisée vers le type de consultation adapté à votre situation.
          </p>
          <Link to="/patient/questionnaire">
            <Button size="lg" className="text-lg px-8 py-6 rounded-full shadow-lg hover:shadow-xl transition-all" style={{ backgroundColor: '#1a3d3d', color: 'white' }}>
              Commencer l'évaluation
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <p className="text-sm text-gray-500 mt-4">
            Gratuit - Sans inscription - 100% confidentiel
          </p>
        </div>
      </section>

      {/* Key Features */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="h-12 w-12 rounded-lg flex items-center justify-center mb-4" style={{ backgroundColor: '#f0f5f0' }}>
                <Clock className="h-6 w-6" style={{ color: '#1a3d3d' }} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Rapide</h3>
              <p className="text-gray-600">
                Répondez à 8 questions simples en moins de 2 minutes pour obtenir votre évaluation
              </p>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="h-12 w-12 rounded-lg flex items-center justify-center mb-4" style={{ backgroundColor: '#f0f5f0' }}>
                <Shield className="h-6 w-6" style={{ color: '#1a3d3d' }} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Sécurisé</h3>
              <p className="text-gray-600">
                Vos données sont protégées et conformes au RGPD. Aucune inscription requise.
              </p>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="h-12 w-12 rounded-lg flex items-center justify-center mb-4" style={{ backgroundColor: '#f0f5f0' }}>
                <UserCheck className="h-6 w-6" style={{ color: '#1a3d3d' }} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Qualifié</h3>
              <p className="text-gray-600">
                Algorithme développé avec des dermatologues pour une orientation fiable
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12" style={{ color: '#1a3d3d' }}>Comment ça marche ?</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="h-16 w-16 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4" style={{ backgroundColor: '#1a3d3d' }}>
                1
              </div>
              <h4 className="font-semibold mb-2">Décrivez</h4>
              <p className="text-sm text-gray-600">Répondez aux questions sur votre problème de peau</p>
            </div>
            <div className="text-center">
              <div className="h-16 w-16 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4" style={{ backgroundColor: '#1a3d3d' }}>
                2
              </div>
              <h4 className="font-semibold mb-2">Photographiez</h4>
              <p className="text-sm text-gray-600">Ajoutez une photo pour une meilleure évaluation (optionnel)</p>
            </div>
            <div className="text-center">
              <div className="h-16 w-16 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4" style={{ backgroundColor: '#1a3d3d' }}>
                3
              </div>
              <h4 className="font-semibold mb-2">Évaluez</h4>
              <p className="text-sm text-gray-600">Obtenez une évaluation de l'urgence de votre situation</p>
            </div>
            <div className="text-center">
              <div className="h-16 w-16 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4" style={{ backgroundColor: '#1a3d3d' }}>
                4
              </div>
              <h4 className="font-semibold mb-2">Consultez</h4>
              <p className="text-sm text-gray-600">Prenez rendez-vous avec un dermatologue si nécessaire</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center mb-6">
            <Stethoscope className="h-16 w-16" style={{ color: '#1a3d3d' }} />
          </div>
          <h2 className="text-3xl font-bold mb-4" style={{ color: '#1a3d3d' }}>
            Besoin d'un avis médical immédiat ?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Consultez un dermatologue en téléconsultation, disponible 7j/7
          </p>
          <a
            href="https://teleconsultation.tessan.io/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button size="lg" variant="outline" className="text-lg px-8 py-6 rounded-full" style={{ borderColor: '#1a3d3d', color: '#1a3d3d' }}>
              Où téléconsulter ?
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-white py-8" style={{ backgroundColor: '#1a3d3d' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-300 text-sm mb-2">
            Ce service ne remplace pas une consultation médicale. En cas d'urgence, appelez le 15.
          </p>
          <p className="text-gray-400 text-xs">&copy; 2026 Tessan. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}
