
import { ObservationForm, ObservationRecord, FetchedObservation, IncidentForm } from '../types';
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
 * Maps Airtable API errors to user-friendly messages for safety personnel.
 */
const handleAirtableError = (response: Response, errorData: any): string => {
  const detail = errorData?.error?.message || "";
  
  if (response.status === 401) return "System authentication failed. The safety database credentials may have expired.";
  if (response.status === 403) return "Access denied. You do not have permission to write to this safety report log.";
  if (response.status === 404) return "The requested safety database or table could not be found. Please check the Base ID.";
  if (response.status === 413) return "The report is too large. Try reducing the number of high-resolution images.";
  
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
        return `Database structure mismatch: The field "${fieldName}" is missing or misnamed in your Airtable. Please ensure a column named exactly "${fieldName}" exists in your table (case-sensitive).`;
      }
      return `Database structure mismatch: A required column is missing or a formula is invalid. Raw error: "${detail}". Please check your Airtable base configuration.`;
    }
    return detail || "The safety data format is incompatible with the database. Please contact support.";
  }
  
  if (response.status >= 500) return "The safety database is currently experiencing high traffic. Retrying connection...";
  
  return detail || response.statusText || "A secure connection to the database could not be established.";
};

/**
 * Wrapper for fetch with retry logic and error mapping.
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
      // "Failed to fetch" is a TypeError thrown by the browser on CORS issues or total connection loss.
      // We handle it gracefully by allowing retries if it's likely a temporary network blip.
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
         if (attempt === maxRetries) {
            throw new Error("Airtable Connection Blocked: Check internet or local firewall/CORS policies.");
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
    throw new Error("Safety Database Configuration is missing. Please set your Base ID.");
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
 * Creates an incident record in Airtable by mapping it to the standard observation structure.
 */
export const submitIncidentReport = async (
  form: IncidentForm, 
  images: AttachmentData[], 
  configOverride?: AirtableConfigOverride
): Promise<boolean> => {
  const BASE_ID = configOverride?.baseId || AIRTABLE_CONFIG.BASE_ID;
  const API_KEY = configOverride?.apiKey || AIRTABLE_CONFIG.API_KEY;
  const TABLE_NAME = AIRTABLE_CONFIG.TABLE_NAME;

  if (!BASE_ID || !API_KEY) {
    throw new Error("Safety Database Configuration is missing. Please set your Base ID.");
  }

  const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE_NAME)}`;
  
  const evidenceAttachments = images.map(img => ({ 
    url: img.url, 
    filename: img.filename 
  }));

  // Construct a comprehensive narrative for the single observation field
  const fullNarrative = `[SEVERITY: ${form.severity.toUpperCase()}] ${form.title}\n\nDescription: ${form.description}\n\nInvolved Parties: ${form.involvedParties || 'None'}\nWitnesses: ${form.witnesses || 'None'}\nImmediate Action: ${form.immediateAction || 'None'}\n\nIncident Time: ${form.date} ${form.time}`;

  const fields: any = {
    "Name": form.reporterName,
    "Role / Position": form.reporterRole,
    "Site / Location": form.location.split('|')[0].trim() || 'Site Area',
    "Observation Type": `INCIDENT: ${form.type}`,
    "Observation": fullNarrative,
    "Open observations": evidenceAttachments,
    "Location": form.location
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
 * Updates an observation record with robust error handling.
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

  if (!BASE_ID || !API_KEY) throw new Error("Safety Database Configuration missing.");

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

  if (!BASE_ID || !API_KEY) throw new Error("Safety Database Configuration missing.");

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

  if (!BASE_ID || !API_KEY) throw new Error("Safety Database Configuration Missing.");

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

  if (!BASE_ID || !API_KEY) throw new Error("Safety Database Configuration Missing.");

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
