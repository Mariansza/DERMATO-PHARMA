const formData = require('form-data');
const Mailgun = require('mailgun.js');

/**
 * Generate patient reminder email HTML template
 */
function generatePatientReminderEmailHtml(data) {
  const { resultat, answers, score } = data;
  const isUrgent = resultat === 'consultation_urgente';

  const badgeColor = isUrgent ? '#f97316' : '#22c55e';
  const badgeText = isUrgent ? 'Consultation recommandée rapidement' : 'Situation non urgente';
  const mainMessage = isUrgent
    ? 'D\'après votre évaluation, nous vous recommandons de consulter un dermatologue dans les prochains jours.'
    : 'D\'après votre évaluation, votre situation ne semble pas urgente. Néanmoins, un avis dermatologique peut vous aider.';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background-color: #1a3d3d; padding: 24px; text-align: center;">
      <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693829947440887924766fee/bee7f8545_Logo.png" alt="Tessan" style="height: 24px;">
    </div>

    <!-- Badge -->
    <div style="padding: 24px 24px 0 24px; text-align: center;">
      <span style="display: inline-block; padding: 8px 16px; background-color: ${badgeColor}; color: white; border-radius: 20px; font-size: 14px; font-weight: 600;">
        ${badgeText}
      </span>
    </div>

    <!-- Content -->
    <div style="padding: 24px;">
      <h1 style="color: #1a3d3d; font-size: 24px; margin: 0 0 16px 0; text-align: center;">
        Votre évaluation dermatologique
      </h1>

      <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0; text-align: center;">
        ${mainMessage}
      </p>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="https://teleconsultation.tessan.io/" style="display: inline-block; background-color: #1a3d3d; color: white; padding: 14px 32px; border-radius: 30px; text-decoration: none; font-weight: 600; font-size: 16px;">
          ${isUrgent ? 'Téléconsulter maintenant' : 'Prendre rendez-vous'}
        </a>
      </div>

      <!-- Summary Box -->
      <div style="background-color: #f0f5f0; border-radius: 8px; padding: 20px; margin-top: 24px;">
        <h3 style="color: #1a3d3d; font-size: 16px; margin: 0 0 12px 0;">
          Récapitulatif de votre évaluation
        </h3>
        <ul style="color: #4b5563; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
          ${answers?.probleme ? `<li>Problème : ${getLabel('probleme', answers.probleme)}</li>` : ''}
          ${answers?.localisation ? `<li>Localisation : ${getLabel('localisation', answers.localisation)}</li>` : ''}
          ${answers?.duree ? `<li>Durée : ${getLabel('duree', answers.duree)}</li>` : ''}
          ${answers?.evolution ? `<li>Évolution : ${getLabel('evolution', answers.evolution)}</li>` : ''}
          ${answers?.symptomes ? `<li>Symptômes : ${getLabel('symptomes', answers.symptomes)}</li>` : ''}
        </ul>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 20px 24px; border-top: 1px solid #e5e7eb;">
      <p style="color: #6b7280; font-size: 12px; margin: 0; text-align: center;">
        Cette évaluation ne remplace pas un diagnostic médical. En cas d'urgence, appelez le 15.
      </p>
      <p style="color: #9ca3af; font-size: 11px; margin: 12px 0 0 0; text-align: center;">
        Tessan - Télémédecine accessible à tous
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

// Helper to get readable labels
function getLabel(category, value) {
  const labels = {
    probleme: {
      'acne': 'Acné',
      'eczema': 'Eczéma / Dermatite',
      'eruption': 'Éruption cutanée',
      'lesion': 'Lésion cutanée',
      'grain_beaute': 'Grain de beauté suspect',
      'autre': 'Autre'
    },
    localisation: {
      'visage': 'Visage',
      'cuir_chevelu': 'Cuir chevelu',
      'tronc': 'Tronc',
      'bras': 'Bras / Mains',
      'jambes': 'Jambes / Pieds',
      'parties_intimes': 'Parties intimes'
    },
    duree: {
      'moins_semaine': 'Moins d\'une semaine',
      '1_4semaines': '1 à 4 semaines',
      '1_3mois': '1 à 3 mois',
      'plus_3mois': 'Plus de 3 mois'
    },
    evolution: {
      'aggravation_rapide': 'Aggravation rapide',
      'aggravation_progressive': 'Aggravation progressive',
      'stable': 'Stable',
      'amelioration': 'En amélioration'
    },
    symptomes: {
      'douleur_intense': 'Douleur intense',
      'demangeaisons': 'Démangeaisons',
      'brulure': 'Sensation de brûlure',
      'gonflement': 'Gonflement',
      'aucun': 'Aucun symptôme'
    }
  };
  return labels[category]?.[value] || value;
}

/**
 * Send patient reminder email
 */
async function sendPatientReminderEmail(to, data) {
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;

  if (!apiKey || !domain) {
    console.warn('Mailgun not configured, patient email logged but not sent');
    console.log('Would send patient reminder to:', to);
    return { success: true, message: 'Email logged (Mailgun not configured)' };
  }

  const mailgun = new Mailgun(formData);
  const mg = mailgun.client({
    username: 'api',
    key: apiKey,
    url: 'https://api.eu.mailgun.net'
  });

  const isUrgent = data.resultat === 'consultation_urgente';
  const subject = isUrgent
    ? 'Votre évaluation dermatologique - Consultation recommandée'
    : 'Votre évaluation dermatologique - Résultats';

  const html = generatePatientReminderEmailHtml(data);

  const result = await mg.messages.create(domain, {
    from: 'Tessan <contact@tessan.io>',
    to: [to],
    subject: subject,
    html: html
  });

  console.log('Patient reminder email sent to:', to, 'Message ID:', result.id);
  return { success: true, message: 'Email sent successfully', id: result.id };
}

async function sendEmail(req) {
  const { to, subject, body, from_name } = req.body;

  if (!to || !subject || !body) {
    throw new Error('Missing required fields: to, subject, body');
  }

  // Get Mailgun config from environment variables
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;

  // Check if Mailgun is configured
  if (!apiKey || !domain) {
    console.warn('Mailgun not configured, email logged but not sent');
    console.log('Would send email to:', to);
    console.log('Subject:', subject);
    return { success: true, message: 'Email logged (Mailgun not configured)' };
  }

  // Create Mailgun client
  const mailgun = new Mailgun(formData);
  const mg = mailgun.client({
    username: 'api',
    key: apiKey,
    url: 'https://api.eu.mailgun.net'  // EU region
  });

  // Default sender
  const fromEmail = 'contact@tessan.io';
  const fromAddress = from_name ? `${from_name} <${fromEmail}>` : `Tessan <${fromEmail}>`;

  // Send email
  const result = await mg.messages.create(domain, {
    from: fromAddress,
    to: [to],
    subject: subject,
    html: body
  });

  console.log('Email sent successfully to:', to, 'Message ID:', result.id);

  return { success: true, message: 'Email sent successfully', id: result.id };
}

module.exports = { sendEmail, sendPatientReminderEmail };
