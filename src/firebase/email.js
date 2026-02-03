/**
 * Email service for sending notifications
 * This uses Firebase Cloud Functions to send emails
 * The actual email sending logic is in the Cloud Functions
 */

const CLOUD_FUNCTIONS_BASE_URL = import.meta.env.VITE_CLOUD_FUNCTIONS_URL || '';

/**
 * Send an email via Cloud Functions
 * @param {Object} params - Email parameters
 * @param {string} params.to - Recipient email
 * @param {string} params.subject - Email subject
 * @param {string} params.body - HTML body content
 * @param {string} [params.from_name] - Sender name
 * @returns {Promise<{success: boolean}>}
 */
export const sendEmail = async ({ to, subject, body, from_name }) => {
  try {
    // If Cloud Functions URL is configured, use it
    if (CLOUD_FUNCTIONS_BASE_URL) {
      const response = await fetch(`${CLOUD_FUNCTIONS_BASE_URL}/sendEmail`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to,
          subject,
          body,
          from_name
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      return { success: true };
    }

    // Fallback: Log the email that would be sent (for development)
    console.log('Email would be sent:', {
      to,
      subject,
      from_name,
      bodyLength: body?.length
    });

    // In development without Cloud Functions, just return success
    // The actual email will need to be configured with a Cloud Function
    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

/**
 * Send medical documents to patient
 * @param {Object} params
 * @param {string} params.patientEmail
 * @param {string} params.patientName
 * @param {string} params.reference
 * @param {string} params.prescriptionUrl
 * @param {string} params.reportUrl
 * @param {string} params.doctorName
 * @param {string} params.pharmacyName
 * @param {string} params.pharmacyCity
 */
export const sendMedicalDocuments = async ({
  patientEmail,
  patientName,
  reference,
  prescriptionUrl,
  reportUrl,
  doctorName,
  pharmacyName,
  pharmacyCity
}) => {
  const emailBody = `
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
<p>Bonjour ${patientName},</p>

<p>Votre demande de tele-expertise dermatologique (reference: <strong>${reference}</strong>) a ete traitee.<br/>
Vous trouverez ci-dessous les liens pour telecharger vos documents :</p>

<p style="margin: 20px 0;">
<a href="${prescriptionUrl}" target="_blank" rel="noopener noreferrer" style="color: #1a3d3d; text-decoration: none; font-weight: bold;">Telecharger l'ordonnance</a>
</p>

<p style="margin: 20px 0;">
<a href="${reportUrl}" target="_blank" rel="noopener noreferrer" style="color: #1a3d3d; text-decoration: none; font-weight: bold;">Telecharger le compte rendu medical</a>
</p>

<p>Ces documents restent accessibles pendant 90 jours.<br/>
Pour toute question, veuillez contacter votre pharmacie : ${pharmacyName} (${pharmacyCity}).</p>

<p style="margin: 20px 0; padding: 15px; background: #f0f5f0; border-left: 3px solid #1a3d3d;">
<strong>Liens utiles :</strong><br/>
<a href="https://teleconsultation.tessan.io/" style="color: #1a3d3d; text-decoration: none;">Trouver une pharmacie partenaire</a><br/>
<a href="https://patient.prod.tessan.cloud/signup" style="color: #1a3d3d; text-decoration: none;">Creer un compte patient</a>
</p>

<p>Cordialement,<br/>
Dr. ${doctorName}<br/>
<em>Service de Tele-expertise Dermatologique</em></p>
</body>
</html>
  `.trim();

  return sendEmail({
    to: patientEmail,
    subject: `Votre avis dermatologique - ${reference}`,
    body: emailBody,
    from_name: `Dr. ${doctorName}`
  });
};
