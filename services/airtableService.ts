
import { ObservationForm, ObservationRecord, FetchedObservation, IncidentForm, FetchedIncident } from '../types';
import { AIRTABLE_CONFIG } from '../constants';

interface AirtableConfigOverride {
  baseId?: string;
  apiKey?: string;
}

interface AttachmentData {
  url: string;
  filename: string;
}

/**
 * Escapes single quotes for Airtable formulas.
 */
const escapeFormulaValue = (value: string): string => {
  return value.replace(/'/g, "\\'");
};

/**
 * Maps Airtable API errors to professional, user-friendly messages for safety personnel.
 */
const handleAirtableError = (response: Response, errorData: any): string => {
  const detail = errorData?.error?.message || "";
  
  if (response.status === 401) return "SECURE LINK REJECTED: Terminal authentication failed. The safety database credentials may have expired.";
  if (response.status === 403) return "ACCESS DENIED: Your current ID does not have authorization to write to this safety report registry.";
  if (response.status === 404) return "REGISTRY NOT FOUND: The requested safety database or 'Incident Reports' table could not be located in the grid.";
  if (response.status === 413) return "TRANSMISSION OVERLOAD: The report payload is too large. Reduce the number of high-resolution images and retry.";
  if (response.status === 429) return "NETWORK CONGESTION: Safety server is handling high volume. Please wait for automatic retry protocol.";
  
  if (response.status === 422) {
    const fieldMatch = detail.match(/['"]([^'"]+)['"]/) || detail.match(/(?:field|column|name)\s+([^ ]+)/i);
    let fieldName = fieldMatch ? fieldMatch[1] : null;

    if (fieldName) {
      fieldName = fieldName.replace(/^names?:\s*/i, '').replace(/^[:\s'"]+|[:\s'"]+$/g, '');
    }
    
    if (detail.toLowerCase().includes("unknown field") || 
        detail.toLowerCase().includes("could not find field") || 
        detail.toLowerCase().includes("not exist") ||
        detail.toLowerCase().includes("invalid filter by formula")) {
      
      if (fieldName) {
        return `STRUCTURE MISMATCH: The required field "${fieldName}" is missing or renamed in the incident registry. Please verify the Airtable schema.`;
      }
      return `DATABASE MISMATCH: A required column is missing from the safety log. System Error: "${detail}".`;
    }
    return `VALIDATION FAILURE: The safety data format is incompatible with the registry. Manual review required.`;
  }
  
  if (response.status >= 500) return "DATABASE GRID INSTABILITY: The remote safety server is currently unresponsive. Report preserved in local queue.";
  
  return detail || response.statusText || "CONNECTION INTERRUPTED: A secure link to the safety registry could not be established.";
};

/**
 * Wrapper for fetch with retry logic and enhanced error mapping.
 */
const fetchWithRetry = async (
  url: string, 
  options: RequestInit, 
  maxRetries = 3
): Promise<any> => {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        let errorData: any;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: { message: 'Unknown server response format' } };
        }

        const friendlyMsg = handleAirtableError(response, errorData);
        // Retry on 429 (rate limit) or 5xx (server error)
        const shouldRetry = (response.status >= 500 || response.status === 429) && attempt < maxRetries;
        
        if (!shouldRetry) {
          throw new Error(friendlyMsg);
        }

        await new Promise(res => setTimeout(res, Math.pow(2, attempt) * 1000));
        continue;
      }

      return await response.json();
    } catch (error: any) {
      lastError = error;
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
         if (attempt === maxRetries) {
            throw new Error("SITE OFFLINE: Terminal cannot establish an internet link. Data queued for local sync.");
         }
      } else if (attempt === maxRetries) {
         throw error;
      }
      await new Promise(res => setTimeout(res, Math.pow(2, attempt) * 1000));
    }
  }
  throw lastError;
};

/**
 * Creates an observation record in Airtable with robust error handling.
 */
export const submitObservationReport = async (
  form: ObservationForm, 
  images: AttachmentData[], 
  configOverride?: AirtableConfigOverride
): Promise<boolean> => {
  const BASE_ID = configOverride?.baseId || AIRTABLE_CONFIG.BASE_ID;
  const API_KEY = configOverride?.apiKey || AIRTABLE_CONFIG.API_KEY;
  const TABLE_NAME = AIRTABLE_CONFIG.TABLE_NAME;

  if (!BASE_ID || !API_KEY) {
    throw new Error("CONFIGURATION FAULT: Safety Database ID or API Key is missing from the terminal.");
  }

  const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE_NAME)}`;
  
  const evidenceAttachments = images.map(img => ({ 
    url: img.url, 
    filename: img.filename 
  }));

  const fields: any = {
    "Name": form.name,
    "Role / Position": form.role,
    "Site / Location": form.site,
    "Observation Type": form.category,
    "Observation": form.observation,
    "Open observations": evidenceAttachments
  };

  if (form.assignedTo && form.assignedTo !== "None") {
    fields["Assigned To"] = form.assignedTo;
  }

  if (form.location) {
    fields["Location"] = form.location;
  }

  await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ records: [{ fields }], typecast: true })
  });

  return true;
};

/**
 * Creates an incident record in Airtable targeting the 'Incident Reports' table.
 */
export const submitIncidentReport = async (
  form: IncidentForm, 
  images: AttachmentData[], 
  configOverride?: AirtableConfigOverride
): Promise<boolean> => {
  const BASE_ID = configOverride?.baseId || AIRTABLE_CONFIG.BASE_ID;
  const API_KEY = configOverride?.apiKey || AIRTABLE_CONFIG.API_KEY;
  const TABLE_NAME = AIRTABLE_CONFIG.INCIDENT_TABLE_NAME;

  if (!BASE_ID || !API_KEY) {
    throw new Error("CONFIGURATION FAULT: Incident Database ID is missing.");
  }

  const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE_NAME)}`;
  
  const severityMap: Record<string, number> = {
    'Minor': 1,
    'Moderate': 2,
    'Major': 4,
    'Critical': 5
  };

  const fields: any = {
    "Title": form.title,
    "Description": form.description,
    "Incident Date": `${form.date}T${form.time}:00.000Z`,
    "Location": form.location.split('|')[0].trim() || 'Site Area',
    "Department": form.department,
    "Status": "open",
    "Severity": severityMap[form.severity] || 1,
    "Category": form.type,
    "Reporter ID": form.reporterName,
    "Persons Involved": form.involvedParties,
    "Equipment Involved": form.equipmentInvolved,
    "Witnesses": form.witnesses,
    "Image URLs": images.map(img => img.url).join(', '),
    "Attachments": images.map(img => ({ url: img.url, filename: img.filename })),
    "Geolocation": form.location,
    "Metadata": JSON.stringify({
      immediateAction: form.immediateAction,
      reporterRole: form.reporterRole,
      concernedEmail: form.concernedEmail
    })
  };

  await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ records: [{ fields }], typecast: true })
  });

  return true;
};

/**
 * Fetches all incident reports.
 */
export const getAllIncidents = async (
  configOverride?: AirtableConfigOverride
): Promise<FetchedIncident[]> => {
  const BASE_ID = configOverride?.baseId || AIRTABLE_CONFIG.BASE_ID;
  const API_KEY = configOverride?.apiKey || AIRTABLE_CONFIG.API_KEY;
  const TABLE_NAME = AIRTABLE_CONFIG.INCIDENT_TABLE_NAME;

  if (!BASE_ID || !API_KEY) throw new Error("CONFIGURATION FAULT: Database credentials missing.");

  const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE_NAME)}?maxRecords=100`;

  try {
    const data = await fetchWithRetry(url, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${API_KEY}` }
    });
    const records = data.records as FetchedIncident[];
    return records.sort((a, b) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime());
  } catch (error) {
    console.error('Incident fetch failed:', error);
    return [];
  }
};

/**
 * Updates an observation record.
 */
export const updateObservationAction = async (
  recordId: string,
  actionTaken: string,
  closedBy: string,
  closingImages: AttachmentData[] = [],
  configOverride?: AirtableConfigOverride
): Promise<boolean> => {
  const BASE_ID = configOverride?.baseId || AIRTABLE_CONFIG.BASE_ID;
  const API_KEY = configOverride?.apiKey || AIRTABLE_CONFIG.API_KEY;
  const TABLE_NAME = AIRTABLE_CONFIG.TABLE_NAME;

  if (!BASE_ID || !API_KEY) throw new Error("CONFIGURATION FAULT: Database credentials missing.");

  const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE_NAME)}/${recordId}`;

  const fieldsToUpdate: any = { 
    "Action taken": actionTaken,
    "Closed by": closedBy 
  };
  
  if (closingImages.length > 0) {
    fieldsToUpdate["Closed observations"] = closingImages.map(img => ({
      url: img.url,
      filename: img.filename
    }));
  }

  await fetchWithRetry(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fields: fieldsToUpdate, typecast: true })
  });

  return true;
};

/**
 * Assigns an observation to a user.
 */
export const assignObservation = async (
  recordId: string,
  assignee: string,
  configOverride?: AirtableConfigOverride
): Promise<boolean> => {
  const BASE_ID = configOverride?.baseId || AIRTABLE_CONFIG.BASE_ID;
  const API_KEY = configOverride?.apiKey || AIRTABLE_CONFIG.API_KEY;
  const TABLE_NAME = AIRTABLE_CONFIG.TABLE_NAME;

  if (!BASE_ID || !API_KEY) throw new Error("CONFIGURATION FAULT: Database credentials missing.");

  const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE_NAME)}/${recordId}`;

  await fetchWithRetry(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fields: { "Assigned To": assignee }, typecast: true })
  });

  return true;
};

/**
 * Fetches critical unclosed observations assigned to a specific user.
 */
export const getAssignedCriticalObservations = async (
  userName: string,
  configOverride?: AirtableConfigOverride
): Promise<FetchedObservation[]> => {
  const BASE_ID = configOverride?.baseId || AIRTABLE_CONFIG.BASE_ID;
  const API_KEY = configOverride?.apiKey || AIRTABLE_CONFIG.API_KEY;
  const TABLE_NAME = AIRTABLE_CONFIG.TABLE_NAME;

  if (!BASE_ID || !API_KEY) throw new Error("CONFIGURATION FAULT: Database credentials missing.");

  const escapedName = escapeFormulaValue(userName);
  const criticalTypes = ['Fire Risk', 'Chemical Spill', 'Respiratory Hazard', 'Equipment Failure'];
  const typeFormula = `OR(${criticalTypes.map(t => `{Observation Type}='${escapeFormulaValue(t)}'`).join(',')})`;
  const formula = `AND({Assigned To}='${escapedName}', {Action taken}='', ${typeFormula})`;
  
  const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE_NAME)}?filterByFormula=${encodeURIComponent(formula)}`;

  const data = await fetchWithRetry(url, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${API_KEY}` }
  });

  return data.records as FetchedObservation[];
};

/**
 * Fetches reports for dashboard statistics.
 */
export const getAllReports = async (
  configOverride?: AirtableConfigOverride
): Promise<FetchedObservation[]> => {
  const BASE_ID = configOverride?.baseId || AIRTABLE_CONFIG.BASE_ID;
  const API_KEY = configOverride?.apiKey || AIRTABLE_CONFIG.API_KEY;
  const TABLE_NAME = AIRTABLE_CONFIG.TABLE_NAME;

  if (!BASE_ID || !API_KEY) throw new Error("CONFIGURATION FAULT: Database credentials missing.");

  const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE_NAME)}?maxRecords=100`;

  try {
    const data = await fetchWithRetry(url, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${API_KEY}` }
    });
    const records = data.records as FetchedObservation[];
    return records.sort((a, b) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime());
  } catch (error) {
    console.error('Dashboard analytical fetch failed:', error);
    return [];
  }
};
