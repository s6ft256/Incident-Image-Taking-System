
import { 
  ObservationForm, 
  FetchedObservation, 
  IncidentForm, 
  FetchedIncident, 
  FetchedCraneChecklist, 
  FetchedEquipmentChecklist 
} from '../types';
import { AIRTABLE_CONFIG, INCIDENT_STATUS } from '../constants';

interface AirtableConfigOverride {
  baseId?: string;
  apiKey?: string;
}

interface AttachmentData {
  url: string;
  filename: string;
}

const handleAirtableError = async (response: Response, context: { baseId: string, tableName: string }): Promise<string> => {
  let errorData: any;
  try {
    errorData = await response.json();
  } catch {
    errorData = { error: { message: response.statusText } };
  }

  if (response.status === 401) return "AUTHENTICATION FAILED: Check your Airtable Personal Access Token.";
  
  if (response.status === 403) {
    return `ACCESS DENIED (403): The token is valid, but it does NOT have permission to access Base "${context.baseId}". 
    Please go to https://airtable.com/create/tokens and ensure:
    1. Scopes 'data.records:read' and 'data.records:write' are selected.
    2. Under "Access", either select "All current and future bases" OR explicitly add this base.`;
  }

  if (response.status === 404 || errorData?.error?.type === 'INVALID_PERMISSIONS_OR_MODEL_NOT_FOUND') {
    return `CONFIGURATION ERROR: Table "${context.tableName}" not found in Base "${context.baseId}". Verify that you are using the correct Table ID (e.g., tbl...) rather than the display name.`;
  }
  
  if (response.status === 422) return `SCHEMA MISMATCH: One or more fields sent do not exist in the Airtable table "${context.tableName}". Check for missing columns or renamed fields.`;
  
  if (response.status === 429) return "RATE LIMIT: Airtable is throttling requests. Please wait.";

  return errorData?.error?.message || "SYSTEM FAULT: Cloud synchronization interrupted.";
};

const fetchWithRetry = async (url: string, options: RequestInit, context: { baseId: string, tableName: string }, maxRetries = 2): Promise<any> => {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        const msg = await handleAirtableError(response, context);
        if ((response.status >= 500 || response.status === 429) && attempt < maxRetries) {
          await new Promise(res => setTimeout(res, Math.pow(2, attempt) * 1000));
          continue;
        }
        throw new Error(msg);
      }
      return await response.json();
    } catch (error: any) {
      lastError = error;
      if (attempt === maxRetries) throw error;
      await new Promise(res => setTimeout(res, 1000));
    }
  }
  throw lastError;
};

const fetchAllPaginatedRecords = async <T>(initialUrl: string, apiKey: string, context: { baseId: string, tableName: string }): Promise<T[]> => {
  let allRecords: T[] = [];
  let offset: string | undefined;

  do {
    const url = offset ? `${initialUrl}${initialUrl.includes('?') ? '&' : '?'}offset=${offset}` : initialUrl;
    const data = await fetchWithRetry(url, { headers: { 'Authorization': `Bearer ${apiKey}` } }, context);
    // Defense: Ensure records is always an array
    allRecords = allRecords.concat(data.records || []);
    offset = data.offset;
  } while (offset);

  return allRecords;
};

export const submitObservationReport = async (form: ObservationForm, images: AttachmentData[], configOverride?: AirtableConfigOverride): Promise<boolean> => {
  const baseId = configOverride?.baseId || AIRTABLE_CONFIG.BASE_ID;
  const apiKey = configOverride?.apiKey || AIRTABLE_CONFIG.API_KEY;
  const tableName = AIRTABLE_CONFIG.TABLES.OBSERVATIONS;
  const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`;
  
  const fields = {
    "Name": form.name,
    "Role / Position": form.role,
    "Site / Location": form.site,
    "Observation Type": form.category,
    "Observation": form.observation,
    "Action taken": form.actionTaken || '',
    "Assigned To": form.assignedTo || '',
    "Location": form.location || '',
    "Open observations": images.map(img => ({ url: img.url, filename: img.filename }))
  };

  await fetchWithRetry(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ records: [{ fields }], typecast: true })
  }, { baseId, tableName });
  
  return true;
};

export const submitIncidentReport = async (form: IncidentForm, images: AttachmentData[], configOverride?: AirtableConfigOverride): Promise<boolean> => {
  const baseId = configOverride?.baseId || AIRTABLE_CONFIG.BASE_ID;
  const apiKey = configOverride?.apiKey || AIRTABLE_CONFIG.API_KEY;
  const tableName = AIRTABLE_CONFIG.TABLES.INCIDENTS;
  const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`;
  
  const fields = {
    "Title": form.title,
    "Description": form.description,
    "Incident Date": `${form.date}T${form.time}:00.000Z`,
    "Location": form.location,
    "Department": form.department,
    "Site / Project": form.site,
    "Status": INCIDENT_STATUS.PENDING_REVIEW,
    "Severity": form.severityScore,
    "Likelihood": form.likelihoodScore,
    "Category": form.type,
    "Reporter ID": form.reporterName,
    "Persons Involved": form.involvedParties,
    "Equipment Involved": form.equipmentInvolved,
    "Witnesses": form.witnesses,
    "Attachments": images.map(img => ({ url: img.url, filename: img.filename })),
    // Workflow Mapping
    "Reviewer": form.reviewer,
    "Review Date": form.reviewDate ? `${form.reviewDate}T00:00:00.000Z` : undefined,
    "Review Comments": form.reviewComments,
    "Corrective Action": form.correctiveAction,
    "Action Assigned To": form.actionAssignedTo,
    "Action Due Date": form.actionDueDate,
    "Verification Comments": form.verificationComments,
    "Closed By": form.closedBy,
    "Closure Date": form.closureDate ? `${form.closureDate}T00:00:00.000Z` : undefined
  };

  await fetchWithRetry(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ records: [{ fields }], typecast: true })
  }, { baseId, tableName });
  
  return true;
};

export const getAllIncidents = async (configOverride?: AirtableConfigOverride): Promise<FetchedIncident[]> => {
  const baseId = configOverride?.baseId || AIRTABLE_CONFIG.BASE_ID;
  const apiKey = configOverride?.apiKey || AIRTABLE_CONFIG.API_KEY;
  const tableName = AIRTABLE_CONFIG.TABLES.INCIDENTS;
  const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`;
  return await fetchAllPaginatedRecords<FetchedIncident>(url, apiKey, { baseId, tableName });
};

export const getAllReports = async (configOverride?: AirtableConfigOverride): Promise<FetchedObservation[]> => {
  const baseId = configOverride?.baseId || AIRTABLE_CONFIG.BASE_ID;
  const apiKey = configOverride?.apiKey || AIRTABLE_CONFIG.API_KEY;
  const tableName = AIRTABLE_CONFIG.TABLES.OBSERVATIONS;
  const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`;
  return await fetchAllPaginatedRecords<FetchedObservation>(url, apiKey, { baseId, tableName });
};

export const updateIncident = async (recordId: string, fields: object, configOverride?: AirtableConfigOverride): Promise<boolean> => {
  const baseId = configOverride?.baseId || AIRTABLE_CONFIG.BASE_ID;
  const apiKey = configOverride?.apiKey || AIRTABLE_CONFIG.API_KEY;
  const tableName = AIRTABLE_CONFIG.TABLES.INCIDENTS;
  const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}/${recordId}`;

  await fetchWithRetry(url, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields, typecast: true })
  }, { baseId, tableName });
  return true;
};

export const getAssignedCriticalObservations = async (userName: string, configOverride?: AirtableConfigOverride): Promise<FetchedObservation[]> => {
  const baseId = configOverride?.baseId || AIRTABLE_CONFIG.BASE_ID;
  const apiKey = configOverride?.apiKey || AIRTABLE_CONFIG.API_KEY;
  const tableName = AIRTABLE_CONFIG.TABLES.OBSERVATIONS;
  const filter = `AND({Assigned To}='${userName}', {Action taken}='')`;
  const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}?filterByFormula=${encodeURIComponent(filter)}`;
  return await fetchAllPaginatedRecords<FetchedObservation>(url, apiKey, { baseId, tableName });
};

export const getAllCraneChecklists = async (configOverride?: AirtableConfigOverride): Promise<FetchedCraneChecklist[]> => {
  const baseId = configOverride?.baseId || AIRTABLE_CONFIG.BASE_ID;
  const apiKey = configOverride?.apiKey || AIRTABLE_CONFIG.API_KEY;
  const tableName = AIRTABLE_CONFIG.TABLES.CRANE_CHECKS;
  const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`;
  return await fetchAllPaginatedRecords<FetchedCraneChecklist>(url, apiKey, { baseId, tableName });
};

export const getAllEquipmentChecklists = async (configOverride?: AirtableConfigOverride): Promise<FetchedEquipmentChecklist[]> => {
  const baseId = configOverride?.baseId || AIRTABLE_CONFIG.BASE_ID;
  const apiKey = configOverride?.apiKey || AIRTABLE_CONFIG.API_KEY;
  const tableName = AIRTABLE_CONFIG.TABLES.EQUIPMENT_CHECKS;
  const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`;
  return await fetchAllPaginatedRecords<FetchedEquipmentChecklist>(url, apiKey, { baseId, tableName });
};

export const submitCraneChecklist = async (craneType: string, metadata: any, checks: object, remarks: object, images: AttachmentData[], configOverride?: AirtableConfigOverride) => {
  const baseId = configOverride?.baseId || AIRTABLE_CONFIG.BASE_ID;
  const apiKey = configOverride?.apiKey || AIRTABLE_CONFIG.API_KEY;
  const tableName = AIRTABLE_CONFIG.TABLES.CRANE_CHECKS;
  const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`;
  
  const hasFail = Object.values(checks).some(v => v === 'fail');
  const fields = {
    "Inspection Date": metadata.date,
    "Inspector Name": metadata.inspector,
    "Crane Type": craneType,
    "Plant Number": metadata.plate,
    "Make and Model": metadata.make,
    "Status": hasFail ? "Grounded" : "Operational",
    "Inspection Data": JSON.stringify({ checks, remarks }),
    "Image": images.map(img => ({ url: img.url, filename: img.filename }))
  };

  await fetchWithRetry(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ records: [{ fields }], typecast: true })
  }, { baseId, tableName });
};

export const submitEquipmentChecklist = async (equipmentType: string, metadata: any, checks: object, remarks: object, images: AttachmentData[], configOverride?: AirtableConfigOverride) => {
  const baseId = configOverride?.baseId || AIRTABLE_CONFIG.BASE_ID;
  const apiKey = configOverride?.apiKey || AIRTABLE_CONFIG.API_KEY;
  const tableName = AIRTABLE_CONFIG.TABLES.EQUIPMENT_CHECKS;
  const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`;
  
  const hasFail = Object.values(checks).some(v => v === 'fail');
  const fields = {
    "Inspection Date": metadata.date,
    "Inspector Name": metadata.inspector,
    "Equipment Type": equipmentType,
    "Plant Number": metadata.plate,
    "Make and Model": metadata.make,
    "Status": hasFail ? "Grounded" : "Operational",
    "Inspection Data": JSON.stringify({ checks, remarks }),
    "Image": images.map(img => ({ url: img.url, filename: img.filename }))
  };

  await fetchWithRetry(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ records: [{ fields }], typecast: true })
  }, { baseId, tableName });
};

export const submitTrainingRoster = async (data: any, images: AttachmentData[], configOverride?: AirtableConfigOverride) => {
  const baseId = configOverride?.baseId || AIRTABLE_CONFIG.BASE_ID;
  const apiKey = configOverride?.apiKey || AIRTABLE_CONFIG.API_KEY;
  const tableName = AIRTABLE_CONFIG.TABLES.TRAINING;
  const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`;
  
  const fields = {
    "Project Name": data.projectName,
    "Location": data.locationText,
    "Contractor": data.contractor,
    "Topic Discussed": data.topicDiscussed,
    "Conducted By": data.conductedBy,
    "Trainees Count": data.trainees.length,
    "Attachments": images.map(img => ({ url: img.url, filename: img.filename }))
  };

  await fetchWithRetry(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ records: [{ fields }], typecast: true })
  }, { baseId, tableName });
};
