const formData = require('form-data');
const Mailgun = require('mailgun.js');

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

module.exports = { sendEmail };
