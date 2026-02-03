const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

admin.initializeApp();

const db = admin.firestore();

// Import function modules
const { syncToHubspot } = require('./src/syncToHubspot');
const { sendEmail } = require('./src/sendEmail');

// Export Cloud Functions
exports.syncToHubspot = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const result = await syncToHubspot(req, db);
      res.json(result);
    } catch (error) {
      console.error('syncToHubspot error:', error);
      res.status(500).json({ error: error.message });
    }
  });
});

exports.sendEmail = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const result = await sendEmail(req);
      res.json(result);
    } catch (error) {
      console.error('sendEmail error:', error);
      res.status(500).json({ error: error.message });
    }
  });
});

// Trigger when a case is updated to "Termine" status
exports.onCaseCompleted = functions.firestore
  .document('cases/{caseId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Check if status changed to "Termine"
    if (before.status !== 'Termine' && after.status === 'Termine') {
      console.log(`Case ${context.params.caseId} completed, triggering HubSpot sync`);

      try {
        // Call syncToHubspot function internally
        const mockReq = {
          method: 'POST',
          body: { caseId: context.params.caseId }
        };
        await syncToHubspot(mockReq, db);
        console.log('HubSpot sync completed successfully');
      } catch (error) {
        console.error('HubSpot sync failed:', error);
      }
    }
  });
