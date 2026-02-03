import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { caseId } = await req.json();

    // Récupérer le dossier
    const cases = await base44.asServiceRole.entities.Case.list();
    const caseData = cases.find(c => c.id === caseId);

    if (!caseData) {
      return Response.json({ error: 'Case not found' }, { status: 404 });
    }

    if (caseData.status !== 'Terminé') {
      return Response.json({ message: 'Case not completed yet' }, { status: 200 });
    }

    // Obtenir le token HubSpot
    const hubspotToken = await base44.asServiceRole.connectors.getAccessToken('hubspot');

    // 1. Créer/mettre à jour la pharmacie (B2B - Company)
    const pharmacyData = {
      properties: {
        name: caseData.pharmacy_name,
        city: caseData.pharmacy_city,
        type: 'B2B',
        description: `Pharmacie partenaire - Contact: ${caseData.pharmacist_name}`
      }
    };

    // Rechercher si la pharmacie existe déjà
    const searchPharmacyResponse = await fetch(
      `https://api.hubapi.com/crm/v3/objects/companies/search`,
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
      // Mettre à jour la pharmacie existante
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
      // Créer une nouvelle pharmacie
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

    // 2. Créer/mettre à jour le pharmacien (B2B - Contact)
    const pharmacistContactData = {
      properties: {
        firstname: caseData.pharmacist_name.split(' ')[0] || caseData.pharmacist_name,
        lastname: caseData.pharmacist_name.split(' ').slice(1).join(' ') || '',
        contact_type: 'B2B',
        jobtitle: 'Pharmacien',
        company: caseData.pharmacy_name
      }
    };

    // Rechercher si le pharmacien existe déjà
    const searchPharmacistResponse = await fetch(
      `https://api.hubapi.com/crm/v3/objects/contacts/search`,
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
      // Mettre à jour le pharmacien existant
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
      // Créer un nouveau contact pharmacien
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

    // Associer le pharmacien à la pharmacie
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

    // 3. Créer/mettre à jour le patient (B2C - Contact)
    const patientContactData = {
      properties: {
        firstname: caseData.patient_first_name,
        lastname: caseData.patient_last_name,
        email: caseData.patient_email,
        contact_type: 'B2C',
        hs_lead_status: 'CUSTOMER'
      }
    };

    // Rechercher si le patient existe déjà par email
    const searchPatientResponse = await fetch(
      `https://api.hubapi.com/crm/v3/objects/contacts/search`,
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
      // Mettre à jour le patient existant
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
      // Créer un nouveau contact patient
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

    return Response.json({ 
      success: true,
      message: 'Données synchronisées avec HubSpot',
      pharmacy: caseData.pharmacy_name,
      pharmacist: caseData.pharmacist_name,
      patient: `${caseData.patient_first_name} ${caseData.patient_last_name}`
    });

  } catch (error) {
    console.error('HubSpot sync error:', error);
    return Response.json({ 
      error: error.message,
      details: error.toString()
    }, { status: 500 });
  }
});