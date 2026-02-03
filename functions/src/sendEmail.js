const functions = require('firebase-functions');
const nodemailer = require('nodemailer');

/**
 * Send email via SMTP
 * Configure SMTP settings in Firebase config:
 * firebase functions:config:set smtp.host="smtp.example.com" smtp.port="587" smtp.user="user" smtp.pass="pass"
 */
async function sendEmail(req) {
  const { to, subject, body, from_name } = req.body;

  if (!to || !subject || !body) {
    throw new Error('Missing required fields: to, subject, body');
  }

  // Get SMTP config from Firebase config or environment
  const smtpConfig = {
    host: functions.config().smtp?.host || process.env.SMTP_HOST,
    port: parseInt(functions.config().smtp?.port || process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: functions.config().smtp?.user || process.env.SMTP_USER,
      pass: functions.config().smtp?.pass || process.env.SMTP_PASS
    }
  };

  // Check if SMTP is configured
  if (!smtpConfig.host || !smtpConfig.auth.user) {
    console.warn('SMTP not configured, email not sent');
    console.log('Would send email:', { to, subject, from_name });
    return { success: true, message: 'Email logged (SMTP not configured)' };
  }

  // Create transporter
  const transporter = nodemailer.createTransport(smtpConfig);

  // Send email
  const mailOptions = {
    from: from_name ? `"${from_name}" <${smtpConfig.auth.user}>` : smtpConfig.auth.user,
    to,
    subject,
    html: body
  };

  await transporter.sendMail(mailOptions);

  return { success: true, message: 'Email sent successfully' };
}

module.exports = { sendEmail };
