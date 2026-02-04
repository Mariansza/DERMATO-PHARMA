const nodemailer = require('nodemailer');

/**
 * Send email via SMTP (Gmail)
 *
 * Pour configurer Gmail:
 * 1. Activer l'authentification à 2 facteurs sur votre compte Google
 * 2. Créer un mot de passe d'application: https://myaccount.google.com/apppasswords
 * 3. Configurer les secrets Firebase:
 *    firebase functions:secrets:set SMTP_USER
 *    firebase functions:secrets:set SMTP_PASS
 */
async function sendEmail(req) {
  const { to, subject, body, from_name } = req.body;

  if (!to || !subject || !body) {
    throw new Error('Missing required fields: to, subject, body');
  }

  // Get SMTP config from environment variables
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  // Check if SMTP is configured
  if (!smtpUser || !smtpPass) {
    console.warn('SMTP not configured, email logged but not sent');
    console.log('Would send email to:', to);
    console.log('Subject:', subject);
    return { success: true, message: 'Email logged (SMTP not configured)' };
  }

  // Create Gmail transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: smtpUser,
      pass: smtpPass
    }
  });

  // Send email
  const mailOptions = {
    from: from_name ? `"${from_name}" <${smtpUser}>` : smtpUser,
    to,
    subject,
    html: body
  };

  await transporter.sendMail(mailOptions);
  console.log('Email sent successfully to:', to);

  return { success: true, message: 'Email sent successfully' };
}

module.exports = { sendEmail };
