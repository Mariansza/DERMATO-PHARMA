const { onRequest } = require('firebase-functions/v2/https');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();

// Import function modules
const { syncToHubspot } = require('./src/syncToHubspot');
const { sendEmail, sendPatientReminderEmail } = require('./src/sendEmail');

// Export Cloud Functions
exports.syncToHubspot = onRequest({ cors: true }, async (req, res) => {
  try {
    const result = await syncToHubspot(req, db);
    res.json(result);
  } catch (error) {
    console.error('syncToHubspot error:', error);
    res.status(500).json({ error: error.message });
  }
});

exports.sendEmail = onRequest({
  cors: true,
  secrets: ['MAILGUN_API_KEY', 'MAILGUN_DOMAIN']
}, async (req, res) => {
  try {
    const result = await sendEmail(req);
    res.json(result);
  } catch (error) {
    console.error('sendEmail error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Trigger: Send email when questionnaire response is created
exports.onQuestionnaireCreated = onDocumentCreated({
  document: 'questionnaire_responses/{docId}',
  secrets: ['MAILGUN_API_KEY', 'MAILGUN_DOMAIN']
}, async (event) => {
  const data = event.data.data();

  // Only send email if email was provided
  if (data.email) {
    try {
      await sendPatientReminderEmail(data.email, data);
      console.log('Patient reminder email sent for questionnaire:', event.params.docId);
    } catch (error) {
      console.error('Error sending patient reminder email:', error);
    }
  } else {
    console.log('No email provided for questionnaire:', event.params.docId);
  }
});
