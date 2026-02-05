/**
 * Patient Triage Scoring Module
 * Calculates urgency score based on questionnaire responses
 */

export function calculateTriageScore(answers) {
  let score = 0;

  // Type de problème (0-3 points)
  if (['lesion', 'grain_beaute'].includes(answers.probleme)) score += 3;
  else if (answers.probleme === 'eruption') score += 2;

  // Durée (0-2 points)
  if (answers.duree === 'moins_semaine') score += 2;
  else if (answers.duree === '1_4semaines') score += 1;

  // Évolution (0-3 points)
  if (answers.evolution === 'aggravation_rapide') score += 3;
  else if (answers.evolution === 'aggravation_progressive') score += 2;

  // Symptômes (0-3 points)
  if (['douleur_intense', 'gonflement'].includes(answers.symptomes)) score += 3;
  else if (['demangeaisons', 'brulure'].includes(answers.symptomes)) score += 1;

  // Localisation (0-1 point)
  if (answers.localisation === 'parties_intimes') score += 1;

  // Antécédents - facteur aggravant
  if (answers.antecedents === 'allergies') score += 1;

  return {
    score,
    resultat: score >= 6 ? 'consultation_urgente' : 'consultation_standard'
  };
}

export const QUESTIONNAIRE_OPTIONS = {
  problemes: [
    { value: 'acne', label: 'Acné' },
    { value: 'eczema', label: 'Eczéma / Dermatite' },
    { value: 'eruption', label: 'Éruption cutanée / Rougeurs' },
    { value: 'lesion', label: 'Lésion / Plaie cutanée' },
    { value: 'grain_beaute', label: 'Grain de beauté suspect' },
    { value: 'autre', label: 'Autre problème' }
  ],
  localisations: [
    { value: 'visage', label: 'Visage' },
    { value: 'cuir_chevelu', label: 'Cuir chevelu' },
    { value: 'tronc', label: 'Tronc (dos, ventre, poitrine)' },
    { value: 'bras', label: 'Bras / Mains' },
    { value: 'jambes', label: 'Jambes / Pieds' },
    { value: 'parties_intimes', label: 'Parties intimes' }
  ],
  durees: [
    { value: 'moins_semaine', label: "Moins d'une semaine" },
    { value: '1_4semaines', label: '1 à 4 semaines' },
    { value: '1_3mois', label: '1 à 3 mois' },
    { value: 'plus_3mois', label: 'Plus de 3 mois' }
  ],
  evolutions: [
    { value: 'aggravation_rapide', label: 'Aggravation rapide' },
    { value: 'aggravation_progressive', label: 'Aggravation progressive' },
    { value: 'stable', label: 'Stable' },
    { value: 'amelioration', label: 'En amélioration' }
  ],
  symptomes: [
    { value: 'douleur_intense', label: 'Douleur intense' },
    { value: 'demangeaisons', label: 'Démangeaisons' },
    { value: 'brulure', label: 'Sensation de brûlure' },
    { value: 'gonflement', label: 'Gonflement' },
    { value: 'aucun', label: 'Aucun symptôme particulier' }
  ],
  antecedents: [
    { value: 'premiere_fois', label: 'Première fois' },
    { value: 'deja_eu', label: 'Déjà eu ce problème' },
    { value: 'en_traitement', label: 'Actuellement en traitement' },
    { value: 'allergies', label: 'Allergies cutanées connues' }
  ],
  ages: [
    { value: 'moins_18', label: 'Moins de 18 ans' },
    { value: '18_30', label: '18-30 ans' },
    { value: '31_50', label: '31-50 ans' },
    { value: '51_70', label: '51-70 ans' },
    { value: 'plus_70', label: 'Plus de 70 ans' }
  ],
  sexes: [
    { value: 'homme', label: 'Homme' },
    { value: 'femme', label: 'Femme' },
    { value: 'autre', label: 'Autre / Ne souhaite pas préciser' }
  ]
};

export const QUESTIONNAIRE_STEPS = [
  {
    id: 'probleme',
    question: 'Quel type de problème de peau avez-vous ?',
    options: QUESTIONNAIRE_OPTIONS.problemes,
    required: true
  },
  {
    id: 'localisation',
    question: 'Où se situe le problème ?',
    options: QUESTIONNAIRE_OPTIONS.localisations,
    required: true
  },
  {
    id: 'duree',
    question: 'Depuis combien de temps avez-vous ce problème ?',
    options: QUESTIONNAIRE_OPTIONS.durees,
    required: true
  },
  {
    id: 'evolution',
    question: 'Comment évolue votre problème ?',
    options: QUESTIONNAIRE_OPTIONS.evolutions,
    required: true
  },
  {
    id: 'symptomes',
    question: 'Avez-vous des symptômes associés ?',
    options: QUESTIONNAIRE_OPTIONS.symptomes,
    required: true
  },
  {
    id: 'antecedents',
    question: 'Avez-vous des antécédents ?',
    options: QUESTIONNAIRE_OPTIONS.antecedents,
    required: true
  },
  {
    id: 'photo',
    question: 'Ajoutez une photo de votre problème de peau',
    type: 'photo',
    required: false
  },
  {
    id: 'description',
    question: 'Souhaitez-vous ajouter des détails ?',
    type: 'textarea',
    placeholder: 'Décrivez votre problème en quelques mots (optionnel)',
    required: false
  }
];
