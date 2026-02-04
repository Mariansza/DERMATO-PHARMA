const { onRequest } = require('firebase-functions/v2/https');
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
