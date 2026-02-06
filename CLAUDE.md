# CLAUDE.md - Documentation Technique Dermato_pharma

> Ce fichier sert de mémoire contextuelle pour les futures sessions Claude Code.

## 1. Vue d'Ensemble

**Nom du projet** : dermato-pharma (marque : Tessan)
**Type** : Plateforme de télémédecine/téléexpertise dermatologique
**URL de production** : https://teledermato.tessan.io
**Projet Firebase** : dermato-pharma
**Branche principale** : main
**Branche de développement** : dev

### Objectif

La plateforme permet :
1. **B2B** : Aux pharmaciens de soumettre des cas dermatologiques pour avis médical expert
2. **B2C** : Aux patients de faire un auto-triage de leur problème de peau

---

## 2. Architecture

### Stack Technique

| Couche | Technologies |
|--------|--------------|
| **Frontend** | React 18, Vite, Tailwind CSS, Radix UI (Shadcn) |
| **Backend** | Firebase Cloud Functions (Node.js 20) |
| **Base de données** | Firestore |
| **Stockage** | Firebase Storage |
| **Authentification** | Firebase Auth |
| **Email** | Mailgun (EU region) |
| **CRM** | HubSpot (sync automatique) |
| **Hébergement** | Firebase Hosting (CDN statique) |
| **Analytics** | Google Tag Manager (GTM-PFJQ9PS) |

### Structure des Dossiers

```
Dermato_pharma/
├── src/
│   ├── pages/                    # Pages React
│   │   ├── patient/              # Pages B2C patient
│   │   └── *.jsx                 # Pages B2B pharmacien/dermato
│   ├── components/
│   │   └── ui/                   # Composants Shadcn UI (45+)
│   ├── firebase/                 # Configuration et accès Firebase
│   │   ├── config.js             # Initialisation Firebase
│   │   ├── firestore.js          # Opérations CRUD Firestore
│   │   ├── storage.js            # Upload/download fichiers
│   │   └── email.js              # Templates email
│   ├── lib/                      # Utilitaires et contextes
│   │   ├── AuthContext.jsx       # Gestion authentification
│   │   └── patientScoring.js     # Algorithme de scoring patient
│   ├── hooks/                    # Hooks React personnalisés
│   ├── App.jsx                   # Composant principal + routing
│   └── pages.config.js           # Configuration des pages
├── functions/                    # Cloud Functions
│   ├── index.js                  # Exports des fonctions
│   └── src/
│       ├── sendEmail.js          # Envoi email Mailgun
│       └── syncToHubspot.js      # Sync CRM HubSpot
├── firestore.rules               # Règles sécurité Firestore
├── storage.rules                 # Règles sécurité Storage
└── firebase.json                 # Configuration déploiement
```

---

## 3. Fonctionnalités Principales

### 3.1 Parcours Pharmacien (B2B)

**Route** : `/` → `/submit-case` → `/case-confirmation`

1. **Soumission de dossier** (14 étapes) :
   - Informations pharmacien et pharmacie
   - Informations patient
   - Détails cliniques (problème, localisation, durée, évolution, symptômes)
   - Upload photos (multiple)
   - Antécédents médicaux
   - Validation et envoi

2. **Après soumission** :
   - Email de confirmation au pharmacien
   - Email de confirmation au patient
   - Création du dossier dans Firestore
   - Référence publique générée (format DP-XXXXX)
   - SLA : 120 heures

### 3.2 Parcours Patient (B2C)

**Route** : `/patient` → `/patient/questionnaire` → `/patient/email-collection` → `/patient/resultat-*`

1. **Questionnaire auto-triage** (8 questions) :
   - Type de problème
   - Localisation
   - Durée
   - Évolution
   - Symptômes
   - Antécédents
   - Photo (optionnelle)
   - Description libre (optionnelle)

2. **Algorithme de scoring** (`src/lib/patientScoring.js`) :
   - Score calculé sur 13 points
   - Score >= 6 → Consultation urgente (page orange)
   - Score < 6 → Consultation standard (page verte)

3. **Collecte email** (optionnelle) :
   - Sauvegarde dans Firestore
   - Déclenchement Cloud Function → Email récapitulatif

### 3.3 Dashboard Dermatologue

**Route** : `/dashboard` (authentifié)

- Liste des dossiers avec filtres (statut, urgence)
- Attribution des dossiers aux dermatologues
- Création d'avis médical
- Génération ordonnances et rapports (PDF)
- Suivi audit trail

---

## 4. Points d'Entrée

### Routes Frontend

```jsx
// Routes publiques B2B
<Route path="/" element={<Home />} />
<Route path="/login" element={<Login />} />
<Route path="/submit-case" element={<SubmitCase />} />
<Route path="/submit-case/questionnaire" element={<SubmitCaseQuestionnaire />} />
<Route path="/case-confirmation" element={<CaseConfirmation />} />

// Routes publiques B2C (patient)
<Route path="/patient" element={<PatientHome />} />
<Route path="/patient/questionnaire" element={<PatientQuestionnaire />} />
<Route path="/patient/email-collection" element={<PatientEmailCollection />} />
<Route path="/patient/resultat-urgent" element={<PatientResultUrgent />} />
<Route path="/patient/resultat-standard" element={<PatientResultStandard />} />

// Routes authentifiées
<Route path="/dashboard" element={<Dashboard />} />
<Route path="/case/:caseId" element={<CaseDetail />} />
```

### Cloud Functions

| Fonction | Trigger | Description |
|----------|---------|-------------|
| `sendEmail` | HTTP | Envoi d'emails via Mailgun |
| `syncToHubspot` | HTTP | Synchronisation CRM des dossiers terminés |
| `onQuestionnaireCreated` | Firestore (create) | Email automatique après questionnaire patient |

---

## 5. Modèles de Données

### Collections Firestore

#### `pharmacists`
```javascript
{
  email: string,
  first_name: string,
  last_name: string,
  phone: string,
  rpps: string,
  pharmacy_name: string,
  pharmacy_address: string,
  pharmacy_city: string,
  pharmacy_postal_code: string,
  created_at: Timestamp
}
```

#### `cases`
```javascript
{
  public_reference: string,      // "DP-XXXXX"
  status: string,                // "nouveau", "en_cours", "termine"
  urgency: string,               // "urgente", "standard"

  // Infos pharmacien
  pharmacist_id: string,
  pharmacist_email: string,
  pharmacy_name: string,

  // Infos patient
  patient_first_name: string,
  patient_last_name: string,
  patient_email: string,
  patient_phone: string,
  patient_dob: string,
  patient_gender: string,

  // Détails cliniques
  problem_type: string,
  location: string,
  duration: string,
  evolution: string,
  symptoms: array,
  description: string,
  medical_history: string,
  current_treatments: string,
  allergies: string,

  // Métadonnées
  photo_paths: array,
  assigned_derm_id: string,
  created_at: Timestamp,
  sla_due_at: string             // ISO 8601, +120h
}
```

#### `questionnaire_responses`
```javascript
{
  // Réponses questionnaire
  answers: {
    probleme: string,
    localisation: string,
    duree: string,
    evolution: string,
    symptomes: string,
    antecedents: string
  },
  description: string,
  photoPath: string | null,

  // Scoring
  score: number,
  resultat: string,              // "consultation_urgente" | "consultation_standard"

  // Contact (optionnel)
  email: string | null,

  // Métadonnées
  created_at: Timestamp,
  submittedAt: string            // ISO 8601
}
```

#### `photos`
```javascript
{
  case_id: string,
  path: string,                  // Chemin Firebase Storage
  url: string,                   // URL de téléchargement
  created_at: Timestamp
}
```

#### `medicalOpinions`
```javascript
{
  case_id: string,
  dermatologist_id: string,
  diagnosis: string,
  recommendations: string,
  prescription: string,
  follow_up: string,
  created_at: Timestamp
}
```

#### `auditLogs`
```javascript
{
  case_id: string,
  action: string,
  user_id: string,
  details: object,
  timestamp: Timestamp
}
```

#### `users`
```javascript
{
  email: string,
  role: string,                  // "pharmacist", "dermatologist", "admin"
  first_name: string,
  last_name: string,
  rpps: string,
  signature_url: string,
  created_at: Timestamp
}
```

---

## 6. Flux de Données

### 6.1 Soumission Dossier Pharmacien

```
[Pharmacien]
    │
    ▼
┌─────────────────────┐
│  /submit-case       │ ← Formulaire 14 étapes
│  (React)            │
└─────────────────────┘
    │
    ├──► Firebase Storage (photos)
    │         │
    │         ▼
    │    photos/{caseId}/{filename}
    │
    ▼
┌─────────────────────┐
│  Firestore          │
│  - cases            │
│  - photos           │
│  - pharmacists      │
│  - auditLogs        │
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│  Cloud Function     │
│  sendEmail          │ ──► Mailgun ──► [Patient Email]
│                     │ ──► Mailgun ──► [Pharmacien Email]
└─────────────────────┘
```

### 6.2 Auto-Triage Patient

```
[Patient]
    │
    ▼
┌─────────────────────┐
│  /patient/          │
│  questionnaire      │ ← 8 questions
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│  patientScoring.js  │
│  calculateTriage()  │ ──► score + resultat
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│  sessionStorage     │ ← Données temporaires
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│  /patient/          │
│  email-collection   │ ← Email (optionnel)
└─────────────────────┘
    │
    ├──► Firebase Storage (photo optionnelle)
    │
    ▼
┌─────────────────────┐
│  Firestore          │
│  questionnaire_     │
│  responses          │
└─────────────────────┘
    │
    │ (Trigger onCreate)
    ▼
┌─────────────────────┐
│  Cloud Function     │
│  onQuestionnaire    │
│  Created            │ ──► sendPatientReminderEmail ──► Mailgun
└─────────────────────┘
    │
    ▼
┌─────────────────────────────────┐
│  Redirection selon résultat    │
│  - score >= 6 → /resultat-urgent│
│  - score < 6  → /resultat-standard│
└─────────────────────────────────┘
```

### 6.3 Synchronisation HubSpot

```
[Dossier terminé]
    │
    ▼
┌─────────────────────┐
│  Cloud Function     │
│  syncToHubspot      │
└─────────────────────┘
    │
    ├──► HubSpot API
    │    ├── Company (Pharmacie)
    │    ├── Contact B2B (Pharmacien)
    │    └── Contact B2C (Patient)
    │
    └──► Associations créées entre entités
```

---

## 7. Configuration et Secrets

### Variables d'Environnement Frontend (.env)

```env
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_AUTH_DOMAIN=dermato-pharma.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=dermato-pharma
VITE_FIREBASE_STORAGE_BUCKET=dermato-pharma.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=xxx
VITE_FIREBASE_APP_ID=xxx
```

### Secrets Cloud Functions

```
MAILGUN_API_KEY     # Clé API Mailgun
MAILGUN_DOMAIN      # Domaine Mailgun (ex: mg.tessan.io)
HUBSPOT_ACCESS_TOKEN # Token API HubSpot (optionnel)
```

---

## 8. Commandes Utiles

### Développement

```bash
npm run dev          # Serveur de développement Vite
npm run build        # Build production
npm run preview      # Prévisualisation du build
npm run lint         # Vérification ESLint
```

### Déploiement Firebase

```bash
# Déployer tout
firebase deploy

# Déployer séparément
firebase deploy --only hosting      # Frontend uniquement
firebase deploy --only functions    # Cloud Functions
firebase deploy --only firestore    # Règles Firestore
firebase deploy --only storage      # Règles Storage
```

### Logs Cloud Functions

```bash
firebase functions:log              # Tous les logs
firebase functions:log --only sendEmail  # Logs fonction spécifique
```

---

## 9. Règles de Sécurité

### Firestore

- **Création publique** : `pharmacists`, `cases`, `photos`, `auditLogs`, `questionnaire_responses`
- **Lecture authentifiée** : Toutes les collections
- **Immutable** : `questionnaire_responses` (pas d'update/delete)
- **Scope UID** : `users` (chaque utilisateur ne peut accéder qu'à ses propres données)

### Storage

- **photos/** : Écriture publique, lecture authentifiée
- **questionnaire-photos/** : Limite 10MB, types image uniquement
- **prescriptions/**, **reports/** : Authentifié requis

---

## 10. Points d'Attention

### Technique

- **SLA dossiers** : 120 heures (défini dans `SubmitCase.jsx`)
- **Scoring patient** : Score >= 6 = urgent (`patientScoring.js`)
- **Photos patient** : Utilisent `URL.createObjectURL()` car non authentifiés
- **Email Mailgun** : Région EU (`api.eu.mailgun.net`)
- **Format référence** : `DP-XXXXX` (généré dans `firestore.js`)

### UX

- **Couleur principale** : `#1a3d3d` (vert Tessan)
- **Mobile-first** : Tester sur mobile (beaucoup de patients)
- **Accents français** : Tous les textes doivent avoir les accents (é, è, à, etc.)
- **Pas d'emojis** : Sauf si explicitement demandé

### Déploiement

- **Projet Firebase** : dermato-pharma
- **Région** : europe-west9
- **Runtime** : Node.js 20 (Cloud Functions)

---

## 11. Contacts et Liens

- **Téléconsultation** : https://teleconsultation.tessan.io/
- **Production** : https://teledermato.tessan.io/
- **Console Firebase** : https://console.firebase.google.com/project/dermato-pharma
- **Logo Tessan** : https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693829947440887924766fee/bee7f8545_Logo.png

---

## 12. Historique des Changements Majeurs

| Date | Changement |
|------|------------|
| 2026-02-06 | Intégration parcours patient B2C (/patient/*) |
| 2026-02-06 | Ajout scoring auto-triage patient |
| 2026-02-06 | Cloud Function onQuestionnaireCreated |
| 2026-02-06 | SLA passé de 48h à 120h |
| 2026-02-06 | Bouton "Téléconsulter" au lieu de "Prendre rendez-vous" |

---

*Dernière mise à jour : 2026-02-06*
