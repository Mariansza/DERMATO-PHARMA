import React from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Clock, Shield, FileText, CheckCircle, Camera } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function Home() {
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
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-block px-4 py-2 rounded-full text-sm font-semibold mb-6" style={{ backgroundColor: '#f0f5f0', color: '#1a3d3d' }}>
            Nouveau service
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6" style={{ color: '#1a3d3d' }}>
            Téléexpertise Dermatologique
          </h1>
          <p className="text-xl text-gray-600 mb-4 leading-relaxed">
            Un avis dermatologique expert pour vos patients en <strong>4 à 5 jours</strong>
          </p>
          <p className="text-lg text-gray-500 mb-8">
            Service dédié aux pharmaciens et médecin : soumettez un dossier clinique avec photos et recevez un avis structuré d'un dermatologue qualifié.
          </p>
          <Link to={createPageUrl('SubmitCase')}>
            <Button size="lg" className="text-lg px-8 py-6 rounded-full shadow-lg hover:shadow-xl transition-all" style={{ backgroundColor: '#1a3d3d', color: 'white' }}>
              Soumettre un dossier
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <p className="text-sm text-gray-500 mt-4">
            🔒 Conforme HDS • RGPD • Données de santé sécurisées
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
              <h3 className="text-xl font-semibold mb-2">Réponse 4-5 jours</h3>
              <p className="text-gray-600">
                Avis dermatologique structuré et détaillé garanti sous 4 à 5 jours
              </p>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="h-12 w-12 rounded-lg flex items-center justify-center mb-4" style={{ backgroundColor: '#f0f5f0' }}>
                <Shield className="h-6 w-6" style={{ color: '#1a3d3d' }} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Sécurisé et conforme</h3>
              <p className="text-gray-600">
                Hébergement HDS, conformité RGPD, données de santé chiffrées
              </p>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="h-12 w-12 rounded-lg flex items-center justify-center mb-4" style={{ backgroundColor: '#f0f5f0' }}>
                <FileText className="h-6 w-6" style={{ color: '#1a3d3d' }} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Avis structuré</h3>
              <p className="text-gray-600">
                Hypothèses diagnostiques, conduite à tenir, orientation patient
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
              <div className="mb-3">
                <FileText className="h-8 w-8 mx-auto text-gray-400" />
              </div>
              <h4 className="font-semibold mb-2">Remplissez le formulaire</h4>
              <p className="text-sm text-gray-600">Contexte clinique détaillé du patient</p>
            </div>
            <div className="text-center">
              <div className="h-16 w-16 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4" style={{ backgroundColor: '#1a3d3d' }}>
                2
              </div>
              <div className="mb-3">
                <Camera className="h-8 w-8 mx-auto text-gray-400" />
              </div>
              <h4 className="font-semibold mb-2">Ajoutez des photos</h4>
              <p className="text-sm text-gray-600">Minimum 2 photos de qualité</p>
            </div>
            <div className="text-center">
              <div className="h-16 w-16 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4" style={{ backgroundColor: '#1a3d3d' }}>
                3
              </div>
              <div className="mb-3">
                <Clock className="h-8 w-8 mx-auto text-gray-400" />
              </div>
              <h4 className="font-semibold mb-2">Recevez l'avis</h4>
              <p className="text-sm text-gray-600">Sous 4-5 jours par email</p>
            </div>
            <div className="text-center">
              <div className="h-16 w-16 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4" style={{ backgroundColor: '#1a3d3d' }}>
                4
              </div>
              <div className="mb-3">
                <CheckCircle className="h-8 w-8 mx-auto text-gray-400" />
              </div>
              <h4 className="font-semibold mb-2">Accompagnez votre patient</h4>
              <p className="text-sm text-gray-600">Avec l'avis du dermatologue</p>
            </div>
          </div>
        </div>
      </section>

      {/* Photo Guidelines */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-8" style={{ color: '#1a3d3d' }}>Conseils de prise de vue</h2>
          <Card className="p-8">
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: '#1a3d3d' }}>1</div>
                  Vue d'ensemble
                </h3>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>• Cadre large incluant la lésion</li>
                  <li>• Pour contextualiser la localisation</li>
                  <li>• Bonne luminosité naturelle</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: '#1a3d3d' }}>2</div>
                  Plan rapproché
                </h3>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>• Centré sur la zone affectée</li>
                  <li>• Netteté optimale</li>
                  <li>• Éviter les ombres</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: '#1a3d3d' }}>3</div>
                  Macro (très proche)
                </h3>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>• Détails de la texture</li>
                  <li>• Mise au point précise</li>
                  <li>• Éclairage uniforme</li>
                </ul>
              </div>
            </div>
            <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-sm text-amber-900 font-medium">
                ⚠️ Important : évitez de photographier le visage si la lésion n'est pas faciale. Vérifiez la netteté avant envoi.
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4" style={{ color: '#1a3d3d' }}>
            Prêt à soumettre un dossier ?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Un cas dermatologique complexe ? Obtenez un avis expert rapidement.
          </p>
          <Link to={createPageUrl('SubmitCase')}>
            <Button size="lg" className="text-lg px-8 py-6 rounded-full" style={{ backgroundColor: '#1a3d3d', color: 'white' }}>
              Démarrer une demande
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-white py-8" style={{ backgroundColor: '#1a3d3d' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-300">&copy; 2026 Tessan. Service de téléexpertise dermatologique.</p>
        </div>
      </footer>
    </div>
  );
}