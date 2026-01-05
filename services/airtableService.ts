
import { ObservationForm, ObservationRecord, FetchedObservation, IncidentForm, FetchedIncident, FetchedCraneChecklist, FetchedEquipmentChecklist } from '../types';
import { AIRTABLE_CONFIG } from '../constants';

interface AirtableConfigOverride {
  baseId?: string;
  apiKey?: string;
}

interface AttachmentData {
  url: string;
  filename: string;
}

const sanitizeBaseId = (baseId?: string): string | undefined => {
  if (!baseId) return baseId;

  const trimmed = baseId.trim();
  if (!trimmed) return undefined;

  // Common copy/paste mistake: users paste `appXXXX.../tblYYYY...`
  // Airtable API expects just the base id: `appXXXX...`
  const noPath = trimmed.split('/')[0];
  return noPath;
};

const getAirtableAuth = (configOverride?: AirtableConfigOverride) => {
  const baseId = sanitizeBaseId(configOverride?.baseId || AIRTABLE_CONFIG.BASE_ID);
  const apiKey = (configOverride?.apiKey || AIRTABLE_CONFIG.API_KEY)?.trim();

  if (!baseId) {
    throw new Error(
      "Airtable is not configured. Set VITE_AIRTABLE_BASE_ID (example: appXXXXXXXXXXXXXX)."
    );
  }
  if (!apiKey) {
    throw new Error(
      "Airtable is not configured. Set VITE_AIRTABLE_API_KEY (a Personal Access Token)."
    );
  }
  if (!baseId.startsWith('app')) {
    throw new Error(
      "Invalid Airtable Base ID. It should start with 'app' and must not include '/tbl...'."
    );
  }

  return { baseId, apiKey };
};

const handleAirtableError = (response: Response, errorData: any): string => {
  const detail = errorData?.error?.message || "";
  if (response.status === 401) return "SECURE LINK REJECTED: Terminal authentication failed.";
  if (response.status === 429) return "NETWORK CONGESTION: Please wait for automatic retry.";
  if (response.status === 422) {
    console.error("Airtable 422 Detail:", errorData);
    return `DATABASE MISMATCH: System Error: "${detail}". ACTION: Verify that your Airtable columns match exactly: 'Project Name', 'Location', 'Contractor', 'Topic', 'Conducted By', 'Date', 'Trainee Count', 'Image' (Attachment).`;
  }
  return detail || response.statusText || "CONNECTION INTERRUPTED.";
};

const fetchWithRetry = async (url: string, options: RequestInit, maxRetries = 3): Promise<any> => {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        let errorData: any;
        try { errorData = await response.json(); } catch { errorData = { error: { message: 'Unknown server response' } }; }
        const friendlyMsg = handleAirtableError(response, errorData);
        if ((response.status >= 500 || response.status === 429) && attempt < maxRetries) {
          await new Promise(res => setTimeout(res, Math.pow(2, attempt) * 1000));
          continue;
        }
        throw new Error(friendlyMsg);
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

export const submitObservationReport = async (form: ObservationForm, images: AttachmentData[], configOverride?: AirtableConfigOverride): Promise<boolean> => {
  const { baseId: BASE_ID, apiKey: API_KEY } = getAirtableAuth(configOverride);
  const TABLE_NAME = AIRTABLE_CONFIG.TABLE_NAME;
  const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE_NAME)}`;
  const fields: any = {
    "Name": form.name,
    "Role / Position": form.role,
    "Site / Location": form.site,
    "Observation Type": form.category,
    "Observation": form.observation,
    "Open observations": images.map(img => ({ url: img.url, filename: img.filename }))
  };
  await fetchWithRetry(url, { method: 'POST', headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ records: [{ fields }], typecast: true }) });
  return true;
};

export const submitIncidentReport = async (form: IncidentForm, images: AttachmentData[], configOverride?: AirtableConfigOverride): Promise<boolean> => {
  const { baseId: BASE_ID, apiKey: API_KEY } = getAirtableAuth(configOverride);
  const TABLE_NAME = AIRTABLE_CONFIG.INCIDENT_TABLE_NAME;
  const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE_NAME)}`;
  const severityMap: Record<string, number> = { 'Minor': 1, 'Moderate': 2, 'Major': 4, 'Critical': 5 };
  const fields: any = {
    "Title": form.title,
    "Description": form.description,
    "Incident Date": `${form.date}T${form.time}:00.000Z`,
    "Location": form.location,
    "Department": form.department,
    "Status": "open",
    "Severity": severityMap[form.severity] || 1,
    "Category": form.type,
    "Reporter ID": form.reporterName,
    "Attachments": images.map(img => ({ url: img.url, filename: img.filename }))
  };
  await fetchWithRetry(url, { method: 'POST', headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ records: [{ fields }], typecast: true }) });
  return true;
};

export const submitTrainingRoster = async (data: any, images: AttachmentData[]): Promise<boolean> => {
  const { baseId: BASE_ID, apiKey: API_KEY } = getAirtableAuth();
  const TABLE_NAME = "Training Roster";
  const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE_NAME)}`;
  
  const fields: any = {
    "Project Name": data.projectName || "Unspecified Project",
    "Location": data.locationText || "GPS Not Available",
    "Contractor": data.contractor || "N/A",
    "Topic": data.topicDiscussed || "Safety Induction",
    "Conducted By": data.conductedBy || "Authorized Personnel",
    "Date": new Date().toISOString().split('T')[0],
    "Trainee Count": data.trainees?.filter((t: any) => t.name.trim() !== '').length || 0,
    "Image": images.map(img => ({ url: img.url, filename: img.filename }))
  };

  await fetchWithRetry(url, { 
    method: 'POST', 
    headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' }, 
    body: JSON.stringify({ records: [{ fields }], typecast: true }) 
  });
  return true;
};

export const submitCraneChecklist = async (craneType: string, metadata: any, checks: Record<string, string>, remarks: Record<string, string>, checklistImages: AttachmentData[] = []): Promise<boolean> => {
  const { baseId: BASE_ID, apiKey: API_KEY } = getAirtableAuth();
  const TABLE_NAME = AIRTABLE_CONFIG.CRANE_CHECK_TABLE_NAME;
  const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE_NAME)}`;
  
  const failures = Object.entries(checks)
    .filter(([_, status]) => status === 'fail')
    .map(([key]) => key.split('-')[0])
    .join(', ');

  const fields: any = {
    "Inspection Date": metadata.date,
    "Inspector Name": metadata.inspector || "Anonymous",
    "Crane Type": craneType || "Not Specified",
    "Plant Number": metadata.plate || "N/A",
    "Make and Model": metadata.make || "N/A",
    "Status": failures.length > 0 ? "Grounded" : "Operational",
    "Critical Failures": failures || "None",
    "Remarks": Object.entries(remarks).map(([k, v]) => `${k}: ${v}`).join('\n'),
    "Inspection Data": JSON.stringify({ checks, remarks }),
    "Image": checklistImages.map(img => ({ url: img.url, filename: img.filename || "image.jpg" }))
  };
  await fetchWithRetry(url, { method: 'POST', headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ records: [{ fields }], typecast: true }) });
  return true;
};

export const submitEquipmentChecklist = async (equipmentType: string, metadata: any, checks: Record<string, string>, remarks: Record<string, string>, checklistImages: AttachmentData[] = []): Promise<boolean> => {
  const { baseId: BASE_ID, apiKey: API_KEY } = getAirtableAuth();
  const TABLE_NAME = 'Equipment Checklists';
  const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE_NAME)}`;
  
  const failures = Object.entries(checks)
    .filter(([_, status]) => status === 'fail')
    .map(([key]) => key.split('-')[0])
    .join(', ');

  const fields: any = {
    "Inspection Date": metadata.date || new Date().toISOString().split('T')[0],
    "Inspector Name": metadata.inspector || "Authorized User",
    "Equipment Type": equipmentType || "General Equipment",
    "Plant Number": metadata.plate || "N/A",
    "Make and Model": metadata.make || "N/A",
    "Status": failures.length > 0 ? "Grounded" : "Operational",
    "Critical Failures": failures || "None",
    "Remarks": Object.entries(remarks).map(([k, v]) => `${k}: ${v}`).join('\n'),
    "Inspection Data": JSON.stringify({ checks, remarks }),
    "Image": checklistImages.map(img => ({ 
      url: img.url, 
      filename: img.filename || `EQUIP_${Date.now()}.jpg` 
    }))
  };

  await fetchWithRetry(url, { method: 'POST', headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ records: [{ fields }], typecast: true }) });
  return true;
};

export const getAllCraneChecklists = async (): Promise<FetchedCraneChecklist[]> => {
  const { baseId: BASE_ID, apiKey: API_KEY } = getAirtableAuth();
  const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(AIRTABLE_CONFIG.CRANE_CHECK_TABLE_NAME)}?maxRecords=100&sort%5B0%5D%5Bfield%5D=Inspection+Date&sort%5B0%5D%5Bdirection%5D=desc`;
  const data = await fetchWithRetry(url, { method: 'GET', headers: { 'Authorization': `Bearer ${API_KEY}` } });
  return data.records;
};

export const getAllEquipmentChecklists = async (): Promise<FetchedEquipmentChecklist[]> => {
  const { baseId: BASE_ID, apiKey: API_KEY } = getAirtableAuth();
  const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent('Equipment Checklists')}?maxRecords=100&sort%5B0%5D%5Bfield%5D=Inspection+Date&sort%5B0%5D%5Bdirection%5D=desc`;
  const data = await fetchWithRetry(url, { method: 'GET', headers: { 'Authorization': `Bearer ${API_KEY}` } });
  return data.records;
};

export const getAllIncidents = async (configOverride?: AirtableConfigOverride): Promise<FetchedIncident[]> => {
  const { baseId: BASE_ID, apiKey: API_KEY } = getAirtableAuth(configOverride);
  const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(AIRTABLE_CONFIG.INCIDENT_TABLE_NAME)}?maxRecords=100`;
  const data = await fetchWithRetry(url, { method: 'GET', headers: { 'Authorization': `Bearer ${API_KEY}` } });
  return data.records.sort((a: any, b: any) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime());
};

export const getAllReports = async (configOverride?: AirtableConfigOverride): Promise<FetchedObservation[]> => {
  const { baseId: BASE_ID, apiKey: API_KEY } = getAirtableAuth(configOverride);
  const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(AIRTABLE_CONFIG.TABLE_NAME)}?maxRecords=100`;
  const data = await fetchWithRetry(url, { method: 'GET', headers: { 'Authorization': `Bearer ${API_KEY}` } });
  return data.records.sort((a: any, b: any) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime());
};

export const updateObservationAction = async (recordId: string, actionTaken: string, closedBy: string, images: AttachmentData[] = [], configOverride?: AirtableConfigOverride): Promise<boolean> => {
  const BASE_ID = configOverride?.baseId || AIRTABLE_CONFIG.BASE_ID;
  const API_KEY = configOverride?.apiKey || AIRTABLE_CONFIG.API_KEY;
  const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(AIRTABLE_CONFIG.TABLE_NAME)}/${recordId}`;
  const fields: any = { "Action taken": actionTaken, "Closed by": closedBy };
  if (images.length > 0) fields["Closed observations"] = images.map(img => ({ url: img.url, filename: img.filename }));
  await fetchWithRetry(url, { method: 'PATCH', headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields, typecast: true }) });
  return true;
};

export const assignObservation = async (recordId: string, assignee: string, configOverride?: AirtableConfigOverride): Promise<boolean> => {
  const BASE_ID = configOverride?.baseId || AIRTABLE_CONFIG.BASE_ID;
  const API_KEY = configOverride?.apiKey || AIRTABLE_CONFIG.API_KEY;
  const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(AIRTABLE_CONFIG.TABLE_NAME)}/${recordId}`;
  await fetchWithRetry(url, { method: 'PATCH', headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: { "Assigned To": assignee }, typecast: true }) });
  return true;
};

export const getAssignedCriticalObservations = async (userName: string, configOverride?: AirtableConfigOverride): Promise<FetchedObservation[]> => {
  const BASE_ID = configOverride?.baseId || AIRTABLE_CONFIG.BASE_ID;
  const API_KEY = configOverride?.apiKey || AIRTABLE_CONFIG.API_KEY;
  const criticalTypes = ['Fire Risk', 'Chemical Spill', 'Respiratory Hazard', 'Equipment Failure'];
  const typeFormula = `OR(${criticalTypes.map(t => `{Observation Type}='${t.replace(/'/g, "\\'")}'`).join(',')})`;
  const formula = `AND({Assigned To}='${userName.replace(/'/g, "\\'")}', {Action taken}='', ${typeFormula})`;
  const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(AIRTABLE_CONFIG.TABLE_NAME)}?filterByFormula=${encodeURIComponent(formula)}`;
  const data = await fetchWithRetry(url, { method: 'GET', headers: { 'Authorization': `Bearer ${API_KEY}` } });
  return data.records;
};
