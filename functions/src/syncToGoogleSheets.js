const { google } = require('googleapis');
const admin = require('firebase-admin');

const db = admin.firestore();

/**
 * Format a date value from various formats to French locale string
 * Handles: Firestore Timestamps, Date objects, strings, numbers (Unix timestamps, Excel serial dates)
 */
function formatDate(dateValue) {
  if (!dateValue) return '';

  try {
    let date;

    // Handle Firestore Timestamp
    if (dateValue.toDate && typeof dateValue.toDate === 'function') {
      date = dateValue.toDate();
    }
    // Handle Firestore Timestamp serialized as object with _seconds
    else if (dateValue._seconds !== undefined) {
      date = new Date(dateValue._seconds * 1000);
    }
    // Handle Excel/Google Sheets serial date (number between 1 and 100000)
    // Excel serial date = days since Dec 30, 1899
    else if (typeof dateValue === 'number' && dateValue > 0 && dateValue < 100000) {
      // Convert Excel serial date to JavaScript Date
      // Excel epoch is Dec 30, 1899
      const excelEpoch = new Date(1899, 11, 30);
      date = new Date(excelEpoch.getTime() + dateValue * 24 * 60 * 60 * 1000);
    }
    // Handle Unix timestamp in seconds (10 digits, > 100 million)
    else if (typeof dateValue === 'number' && dateValue >= 100000000 && dateValue < 10000000000) {
      date = new Date(dateValue * 1000);
    }
    // Handle Unix timestamp in milliseconds (13 digits)
    else if (typeof dateValue === 'number' && dateValue >= 10000000000) {
      date = new Date(dateValue);
    }
    // Handle string in format DD/MM/YYYY
    else if (typeof dateValue === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(dateValue)) {
      const [day, month, year] = dateValue.split('/');
      date = new Date(year, month - 1, day);
    }
    // Handle string in format YYYY-MM-DD
    else if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateValue)) {
      date = new Date(dateValue);
    }
    // Handle Date object or other string formats
    else if (typeof dateValue === 'string' || dateValue instanceof Date) {
      date = new Date(dateValue);
    }

    // Check if date is valid
    if (!date || isNaN(date.getTime())) {
      return '';
    }

    // Prefix with ' to force Google Sheets to treat as text (prevents auto-conversion)
    return "'" + date.toLocaleDateString('fr-FR');
  } catch (error) {
    console.warn('Error formatting date:', dateValue, error.message);
    return '';
  }
}

/**
 * Synchronize a completed case to Google Sheets
 * @param {Object} caseData - The case document data
 * @param {string} caseId - The case document ID
 */
async function syncCaseToGoogleSheets(caseData, caseId) {
  // Get credentials and sheet ID from secrets
  const credentials = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS);
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  // Initialize Google Sheets API with service account
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // Fetch pharmacist data if pharmacist_id is available
  let pharmacistData = {};
  if (caseData.pharmacist_id) {
    try {
      const pharmacistDoc = await db.collection('pharmacists').doc(caseData.pharmacist_id).get();
      if (pharmacistDoc.exists) {
        pharmacistData = pharmacistDoc.data();
      }
    } catch (error) {
      console.warn('Could not fetch pharmacist data:', error.message);
    }
  }

  // Split pharmacist name into first name and last name
  const pharmacistNameParts = (caseData.pharmacist_name || '').split(' ');
  const pharmacistFirstName = pharmacistNameParts[0] || '';
  const pharmacistLastName = pharmacistNameParts.slice(1).join(' ') || '';

  // Prepare the row data according to the mapping
  const rowData = [
    caseId,                                           // ID Case
    pharmacistFirstName,                              // Prénom Pharmacien
    pharmacistLastName,                               // Nom Pharmacien
    caseData.pharmacy_name || '',                     // Pharmacie
    pharmacistData.finess || pharmacistData.adeli || '', // FINESS
    formatDate(caseData.created_date),                // Date Demande
    formatDate(caseData.closed_at),                   // Date TED
    caseData.assigned_derm_name || '',                // Dermatologue
    caseData.patient_ssn || '',                       // N° Sécu Patient
    formatDate(caseData.patient_birthdate),           // Date Naissance
  ];

  const sheetName = 'TED WEBAPP';
  const range = `'${sheetName}'!A:J`;

  try {
    // Check if sheet is empty (no headers)
    const existingData = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${sheetName}'!A1:J1`,
    });

    // Add headers if sheet is empty
    if (!existingData.data.values || existingData.data.values.length === 0) {
      const headers = [
        'ID Case',
        'Prénom Pharmacien',
        'Nom Pharmacien',
        'Pharmacie',
        'FINESS',
        'Date Demande',
        'Date TED',
        'Dermatologue',
        'N° Sécu Patient',
        'Date Naissance',
      ];

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${sheetName}'!A1:J1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [headers],
        },
      });
      console.log('Headers added to Google Sheet');
    }

    // Append the row to the spreadsheet
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [rowData],
      },
    });

    console.log(`Case ${caseId} synced to Google Sheets successfully`);
    return { success: true, caseId };
  } catch (error) {
    console.error(`Error syncing case ${caseId} to Google Sheets:`, error);
    throw error;
  }
}

/**
 * Sync all existing completed cases to Google Sheets (one-time migration)
 */
async function syncAllCompletedCases() {
  const credentials = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS);
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const sheetName = 'TED WEBAPP';

  // Get all cases with status "Termine"
  const casesSnapshot = await db.collection('cases').where('status', '==', 'Termine').get();

  if (casesSnapshot.empty) {
    return { success: true, message: 'No completed cases found', count: 0 };
  }

  // Check if sheet has headers, add if not
  const existingData = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${sheetName}'!A1:J1`,
  });

  if (!existingData.data.values || existingData.data.values.length === 0) {
    const headers = [
      'ID Case',
      'Prénom Pharmacien',
      'Nom Pharmacien',
      'Pharmacie',
      'FINESS',
      'Date Demande',
      'Date TED',
      'Dermatologue',
      'N° Sécu Patient',
      'Date Naissance',
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${sheetName}'!A1:J1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [headers],
      },
    });
  }

  // Prepare all rows
  const rows = [];
  for (const doc of casesSnapshot.docs) {
    const caseData = doc.data();
    const caseId = doc.id;

    // Fetch pharmacist data
    let pharmacistData = {};
    if (caseData.pharmacist_id) {
      try {
        const pharmacistDoc = await db.collection('pharmacists').doc(caseData.pharmacist_id).get();
        if (pharmacistDoc.exists) {
          pharmacistData = pharmacistDoc.data();
        }
      } catch (error) {
        console.warn('Could not fetch pharmacist data:', error.message);
      }
    }

    const pharmacistNameParts = (caseData.pharmacist_name || '').split(' ');
    const pharmacistFirstName = pharmacistNameParts[0] || '';
    const pharmacistLastName = pharmacistNameParts.slice(1).join(' ') || '';

    rows.push([
      caseId,
      pharmacistFirstName,
      pharmacistLastName,
      caseData.pharmacy_name || '',
      pharmacistData.finess || pharmacistData.adeli || '',
      formatDate(caseData.created_date),
      formatDate(caseData.closed_at),
      caseData.assigned_derm_name || '',
      caseData.patient_ssn || '',
      formatDate(caseData.patient_birthdate),
    ]);
  }

  // Append all rows at once
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `'${sheetName}'!A:J`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: rows,
    },
  });

  // Get sheet ID for formatting
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = spreadsheet.data.sheets.find(s => s.properties.title === sheetName);
  const sheetId = sheet ? sheet.properties.sheetId : 0;

  // Format as table: bold header, borders, freeze header row
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        // Bold header row
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: 0,
              endRowIndex: 1,
              startColumnIndex: 0,
              endColumnIndex: 10,
            },
            cell: {
              userEnteredFormat: {
                textFormat: { bold: true },
                backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
              },
            },
            fields: 'userEnteredFormat(textFormat,backgroundColor)',
          },
        },
        // Freeze header row
        {
          updateSheetProperties: {
            properties: {
              sheetId,
              gridProperties: { frozenRowCount: 1 },
            },
            fields: 'gridProperties.frozenRowCount',
          },
        },
        // Add borders to all data
        {
          updateBorders: {
            range: {
              sheetId,
              startRowIndex: 0,
              endRowIndex: rows.length + 1,
              startColumnIndex: 0,
              endColumnIndex: 10,
            },
            top: { style: 'SOLID', color: { red: 0.8, green: 0.8, blue: 0.8 } },
            bottom: { style: 'SOLID', color: { red: 0.8, green: 0.8, blue: 0.8 } },
            left: { style: 'SOLID', color: { red: 0.8, green: 0.8, blue: 0.8 } },
            right: { style: 'SOLID', color: { red: 0.8, green: 0.8, blue: 0.8 } },
            innerHorizontal: { style: 'SOLID', color: { red: 0.8, green: 0.8, blue: 0.8 } },
            innerVertical: { style: 'SOLID', color: { red: 0.8, green: 0.8, blue: 0.8 } },
          },
        },
        // Auto-resize columns
        {
          autoResizeDimensions: {
            dimensions: {
              sheetId,
              dimension: 'COLUMNS',
              startIndex: 0,
              endIndex: 10,
            },
          },
        },
      ],
    },
  });

  console.log(`Synced ${rows.length} completed cases to Google Sheets`);
  return { success: true, count: rows.length };
}

module.exports = { syncCaseToGoogleSheets, syncAllCompletedCases };
