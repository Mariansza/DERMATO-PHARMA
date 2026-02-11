# Tessan - Plateforme de Télédermatologie

Plateforme de télémédecine permettant la téléexpertise dermatologique entre pharmaciens et dermatologues, ainsi que l'auto-triage pour les patients.

**Production** : [teledermato.tessan.io](https://teledermato.tessan.io)

---

## Contexte

Les problèmes dermatologiques représentent une part importante des consultations médicales, mais l'accès aux dermatologues reste difficile (délais d'attente longs, déserts médicaux). Cette plateforme répond à ce besoin en proposant deux parcours complémentaires.

---

## Fonctionnalités

### Parcours Pharmacien (B2B)

Les pharmaciens peuvent soumettre des dossiers dermatologiques pour obtenir un avis médical expert :

- Formulaire de soumission en 14 étapes
- Upload de photos des lésions
- Informations patient et antécédents médicaux
- Délai de réponse garanti (SLA 120h)
- Email de confirmation au pharmacien et au patient

### Parcours Patient (B2C)

Les patients peuvent effectuer un auto-triage de leur problème de peau :

- Questionnaire en 8 questions
- Algorithme de scoring automatique
- Orientation vers une consultation urgente ou standard
- Photo optionnelle
- Email récapitulatif

### Dashboard Dermatologue

Interface de gestion pour les dermatologues :

- Liste des dossiers avec filtres (statut, urgence)
- Attribution des dossiers
- Rédaction d'avis médicaux
- Génération d'ordonnances et rapports PDF

---

## Stack Technique

| Couche | Technologies |
|--------|--------------|
| Frontend | React 18, Vite, Tailwind CSS, Radix UI |
| Backend | Firebase Cloud Functions (Node.js 20) |
| Base de données | Firestore |
| Stockage | Firebase Storage |
| Authentification | Firebase Auth |
| Email | Mailgun |
| CRM | HubSpot |

---

## Installation

### Prérequis

- Node.js 20+
- npm
- Firebase CLI (`npm install -g firebase-tools`)

### Configuration

1. Cloner le repository :
```bash
git clone https://github.com/mariantessan/Dermato_pharma.git
cd Dermato_pharma
```

2. Installer les dépendances :
```bash
npm install
cd functions && npm install && cd ..
```

3. Configurer les variables d'environnement :
```bash
cp .env.example .env
# Remplir les valeurs Firebase dans .env
```

4. Lancer le serveur de développement :
```bash
npm run dev
```

---

## Scripts

| Commande | Description |
|----------|-------------|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run preview` | Prévisualisation du build |
| `npm run lint` | Vérification ESLint |

---

## Déploiement

```bash
# Déployer tout
firebase deploy

# Déployer séparément
firebase deploy --only hosting     # Frontend
firebase deploy --only functions   # Cloud Functions
firebase deploy --only firestore   # Règles Firestore
firebase deploy --only storage     # Règles Storage
```

---

## Structure du Projet

```
Dermato_pharma/
├── src/
│   ├── pages/           # Pages React
│   │   └── patient/     # Pages parcours patient B2C
│   ├── components/ui/   # Composants Shadcn UI
│   ├── firebase/        # Configuration Firebase
│   ├── lib/             # Utilitaires et contextes
│   └── hooks/           # Hooks React personnalisés
├── functions/           # Cloud Functions
└── firebase.json        # Configuration Firebase
```

---

## Licence

Projet propriétaire - Tessan
