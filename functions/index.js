const { onRequest } = require('firebase-functions/v2/https');
const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();

// Import function modules
const { syncToHubspot } = require('./src/syncToHubspot');
const { sendEmail } = require('./src/sendEmail');

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

exports.sendEmail = onRequest({ cors: true }, async (req, res) => {
  try {
    const result = await sendEmail(req);
    res.json(result);
  } catch (error) {
    console.error('sendEmail error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Trigger when a case is updated to "Termine" status
exports.onCaseCompleted = onDocumentUpdated('cases/{caseId}', async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();

  // Check if status changed to "Termine"
  if (before.status !== 'Termine' && after.status === 'Termine') {
    console.log(`Case ${event.params.caseId} completed, triggering HubSpot sync`);

    try {
      // Call syncToHubspot function internally
      const mockReq = {
        method: 'POST',
        body: { caseId: event.params.caseId }
      };
      await syncToHubspot(mockReq, db);
      console.log('HubSpot sync completed successfully');
    } catch (error) {
      console.error('HubSpot sync failed:', error);
    }
  }
});
