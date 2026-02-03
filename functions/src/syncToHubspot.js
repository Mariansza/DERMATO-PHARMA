const functions = require('firebase-functions');

/**
 * Sync case data to HubSpot CRM
 * Creates/updates: Pharmacy (Company), Pharmacist (B2B Contact), Patient (B2C Contact)
 */
async function syncToHubspot(req, db) {
  const caseId = req.body?.caseId;

  if (!caseId) {
    throw new Error('caseId is required');
  }

  // Get HubSpot token from Firebase config or environment
  const hubspotToken = functions.config().hubspot?.access_token || process.env.HUBSPOT_ACCESS_TOKEN;

  if (!hubspotToken) {
    console.warn('HubSpot token not configured, skipping sync');
    return { success: false, message: 'HubSpot token not configured' };
  }

  // Get case data from Firestore
  const caseDoc = await db.collection('cases').doc(caseId).get();

  if (!caseDoc.exists) {
    throw new Error('Case not found');
  }

  const caseData = { id: caseDoc.id, ...caseDoc.data() };

  if (caseData.status !== 'Termine') {
    return { success: true, message: 'Case not completed yet' };
  }

  // 1. Create/update pharmacy (B2B - Company)
  const pharmacyData = {
    properties: {
      name: caseData.pharmacy_name,
      city: caseData.pharmacy_city,
      type: 'B2B',
      description: `Pharmacie partenaire - Contact: ${caseData.pharmacist_name}`
    }
  };

  // Search for existing pharmacy
  const searchPharmacyResponse = await fetch(
    'https://api.hubapi.com/crm/v3/objects/companies/search',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hubspotToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filterGroups: [{
          filters: [{
            propertyName: 'name',
            operator: 'EQ',
            value: caseData.pharmacy_name
          }]
        }]
      })
    }
  );

  const searchPharmacyResult = await searchPharmacyResponse.json();
  let pharmacyId;

  if (searchPharmacyResult.results && searchPharmacyResult.results.length > 0) {
    // Update existing pharmacy
    pharmacyId = searchPharmacyResult.results[0].id;
    await fetch(`https://api.hubapi.com/crm/v3/objects/companies/${pharmacyId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${hubspotToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(pharmacyData)
    });
  } else {
    // Create new pharmacy
    const createPharmacyResponse = await fetch(
      'https://api.hubapi.com/crm/v3/objects/companies',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${hubspotToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(pharmacyData)
      }
    );
    const newPharmacy = await createPharmacyResponse.json();
    pharmacyId = newPharmacy.id;
  }

  // 2. Create/update pharmacist (B2B - Contact)
  const pharmacistContactData = {
    properties: {
      firstname: caseData.pharmacist_name?.split(' ')[0] || caseData.pharmacist_name,
      lastname: caseData.pharmacist_name?.split(' ').slice(1).join(' ') || '',
      contact_type: 'B2B',
      jobtitle: 'Pharmacien',
      company: caseData.pharmacy_name
    }
  };

  // Search for existing pharmacist
  const searchPharmacistResponse = await fetch(
    'https://api.hubapi.com/crm/v3/objects/contacts/search',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hubspotToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filterGroups: [{
          filters: [{
            propertyName: 'firstname',
            operator: 'EQ',
            value: pharmacistContactData.properties.firstname
          }, {
            propertyName: 'company',
            operator: 'EQ',
            value: caseData.pharmacy_name
          }]
        }]
      })
    }
  );

  const searchPharmacistResult = await searchPharmacistResponse.json();
  let pharmacistId;

  if (searchPharmacistResult.results && searchPharmacistResult.results.length > 0) {
    // Update existing pharmacist
    pharmacistId = searchPharmacistResult.results[0].id;
    await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${pharmacistId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${hubspotToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(pharmacistContactData)
    });
  } else {
    // Create new pharmacist contact
    const createPharmacistResponse = await fetch(
      'https://api.hubapi.com/crm/v3/objects/contacts',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${hubspotToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(pharmacistContactData)
      }
    );
    const newPharmacist = await createPharmacistResponse.json();
    pharmacistId = newPharmacist.id;
  }

  // Associate pharmacist with pharmacy
  if (pharmacistId && pharmacyId) {
    await fetch(
      `https://api.hubapi.com/crm/v3/objects/contacts/${pharmacistId}/associations/companies/${pharmacyId}/contact_to_company`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${hubspotToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
  }

  // 3. Create/update patient (B2C - Contact)
  const patientContactData = {
    properties: {
      firstname: caseData.patient_first_name,
      lastname: caseData.patient_last_name,
      email: caseData.patient_email,
      contact_type: 'B2C',
      hs_lead_status: 'CUSTOMER'
    }
  };

  // Search for existing patient by email
  const searchPatientResponse = await fetch(
    'https://api.hubapi.com/crm/v3/objects/contacts/search',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hubspotToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filterGroups: [{
          filters: [{
            propertyName: 'email',
            operator: 'EQ',
            value: caseData.patient_email
          }]
        }]
      })
    }
  );

  const searchPatientResult = await searchPatientResponse.json();

  if (searchPatientResult.results && searchPatientResult.results.length > 0) {
    // Update existing patient
    const patientId = searchPatientResult.results[0].id;
    await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${patientId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${hubspotToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(patientContactData)
    });
  } else {
    // Create new patient contact
    await fetch(
      'https://api.hubapi.com/crm/v3/objects/contacts',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${hubspotToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(patientContactData)
      }
    );
  }

  return {
    success: true,
    message: 'Donnees synchronisees avec HubSpot',
    pharmacy: caseData.pharmacy_name,
    pharmacist: caseData.pharmacist_name,
    patient: `${caseData.patient_first_name} ${caseData.patient_last_name}`
  };
}

module.exports = { syncToHubspot };
