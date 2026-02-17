const { onRequest } = require('firebase-functions/v2/https');
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();

// Import function modules
const { syncToHubspot } = require('./src/syncToHubspot');
const { sendEmail, sendPatientReminderEmail } = require('./src/sendEmail');
const { syncCaseToGoogleSheets, syncAllCompletedCases } = require('./src/syncToGoogleSheets');

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

// Trigger: Sync case to Google Sheets when status changes to "Termine"
exports.onCaseCompleted = onDocumentUpdated({
  document: 'cases/{caseId}',
  secrets: ['GOOGLE_SHEETS_CREDENTIALS', 'GOOGLE_SHEET_ID']
}, async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();

  // Only trigger when status changes to "Termine"
  if (before.status !== 'Termine' && after.status === 'Termine') {
    try {
      await syncCaseToGoogleSheets(after, event.params.caseId);
      console.log('Case synced to Google Sheets:', event.params.caseId);
    } catch (error) {
      console.error('Error syncing case to Google Sheets:', error);
    }
  }
});

// HTTP: One-time migration of all completed cases to Google Sheets
exports.migrateCompletedCasesToSheets = onRequest({
  cors: true,
  secrets: ['GOOGLE_SHEETS_CREDENTIALS', 'GOOGLE_SHEET_ID']
}, async (req, res) => {
  try {
    const result = await syncAllCompletedCases();
    res.json(result);
  } catch (error) {
    console.error('migrateCompletedCasesToSheets error:', error);
    res.status(500).json({ error: error.message });
  }
});
