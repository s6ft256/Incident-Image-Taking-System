import { IncidentForm, IncidentRecord, FetchedIncident } from '../types';
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
 * Maps Airtable API errors to user-friendly messages for safety personnel.
 */
const handleAirtableError = (response: Response, errorData: any): string => {
  if (response.status === 401) return "System authentication failed. The safety database credentials may have expired.";
  if (response.status === 403) return "Access denied. You do not have permission to write to this safety report log.";
  if (response.status === 404) return "The requested safety database or table could not be found. Please check the Base ID.";
  if (response.status === 413) return "The report is too large. Try reducing the number of high-resolution images.";
  if (response.status === 422) {
    const detail = errorData?.error?.message || "";
    if (detail.includes("Unknown field name")) {
      const fieldMatch = detail.match(/field\s+(['"])(.*?)\1/i) || detail.match(/name\s+(['"])(.*?)\1/i);
      const fieldName = fieldMatch ? fieldMatch[2] : "Unknown";
      return `Database structure mismatch: Field "${fieldName}" is missing in Airtable. Ensure columns match exactly (case-sensitive).`;
    }
    return errorData?.error?.message || "The safety data format is incompatible with the database. Please contact support.";
  }
  if (response.status >= 500) return "The safety database is currently experiencing high traffic. Retrying connection...";
  
  return errorData?.error?.message || response.statusText || "A secure connection to the database could not be established.";
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
      if (attempt === maxRetries) throw error;
      await new Promise(res => setTimeout(res, Math.pow(2, attempt) * 1000));
    }
  }
  throw lastError;
};

/**
 * Creates a record in Airtable with robust error handling.
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

  const record = {
    fields: {
      "Name": form.name,
      "Role / Position": form.role,
      "Site / Location": form.site,
      "Incident Type": form.category,
      "Observation": form.observation,
      "Assigned To": form.assignedTo || "",
      "Open observations": evidenceAttachments
    }
  };

  await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ records: [record], typecast: true })
  });

  return true;
};

/**
 * Updates an incident record with robust error handling.
 */
export const updateIncidentAction = async (
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
 * Assigns an incident to a user.
 */
export const assignIncident = async (
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
 * Fetches reports submitted within the last 24 hours.
 */
export const getRecentReports = async (
  configOverride?: AirtableConfigOverride
): Promise<FetchedIncident[]> => {
  const BASE_ID = configOverride?.baseId || AIRTABLE_CONFIG.BASE_ID;
  const API_KEY = configOverride?.apiKey || AIRTABLE_CONFIG.API_KEY;
  const TABLE_NAME = AIRTABLE_CONFIG.TABLE_NAME;

  if (!BASE_ID || !API_KEY) throw new Error("Safety Database Configuration Missing.");

  const formula = `IS_AFTER(CREATED_TIME(), DATEADD(NOW(), -1, 'days'))`;
  const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE_NAME)}?filterByFormula=${encodeURIComponent(formula)}`;

  const data = await fetchWithRetry(url, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${API_KEY}` }
  });

  const records = data.records as FetchedIncident[];
  return records.sort((a, b) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime());
};

/**
 * Fetches reports for dashboard statistics.
 */
export const getAllReports = async (
  configOverride?: AirtableConfigOverride
): Promise<FetchedIncident[]> => {
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
    const records = data.records as FetchedIncident[];
    return records.sort((a, b) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime());
  } catch (error) {
    console.error('Dashboard analytical fetch failed:', error);
    return [];
  }
};