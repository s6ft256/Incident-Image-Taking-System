
import { 
  ObservationForm, 
  FetchedObservation, 
  IncidentForm, 
  FetchedIncident, 
  FetchedCraneChecklist, 
  FetchedEquipmentChecklist 
} from '../types';
import { AIRTABLE_CONFIG, INCIDENT_STATUS } from '../constants';
import { fileToBase64 } from '../utils/fileToBase64';
import { persistEvidenceFallback } from './evidenceRegistryService';

interface AirtableConfigOverride {
  baseId?: string;
  apiKey?: string;
}

interface AttachmentData {
  url: string;
  filename: string;
}

/** A raw evidence image awaiting upload to an Airtable attachment field. */
export interface EvidenceFile {
  file: File;
  filename: string;
}

const handleAirtableError = async (response: Response, context: { baseId: string, tableName: string }): Promise<string> => {
  let errorData: any;
  try {
    errorData = await response.json();
  } catch {
    errorData = { error: { message: response.statusText } };
  }

  // Log exact error for debugging
  console.error("🔴 AIRTABLE ERROR RESPONSE:", JSON.stringify(errorData, null, 2));

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
  
  if (response.status === 422) {
    // Show exact error message from Airtable including which field is invalid
    const exactError = errorData?.error?.message || 'Unknown field error';
    return `SCHEMA MISMATCH (422): ${exactError}`;
  }
  
  if (response.status === 429) return "RATE LIMIT: Airtable is throttling requests. Please wait.";

  return errorData?.error?.message || "SYSTEM FAULT: Cloud synchronization interrupted.";
};

const fetchWithRetry = async (url: string, options: RequestInit, context: { baseId: string, tableName: string }, maxRetries = 2): Promise<any> => {
  const authorization = new Headers(options.headers).get('Authorization');
  if (!context.baseId || !authorization?.startsWith('Bearer ') || authorization.length <= 7) {
    throw new Error('CONFIGURATION FAULT: Set VITE_AIRTABLE_BASE_ID and VITE_AIRTABLE_API_KEY to connect Airtable.');
  }

  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let response: Response;
    try {
      response = await fetch(url, options);
    } catch (error: unknown) {
      lastError = error;
      if (attempt === maxRetries) throw error;
      await new Promise(res => setTimeout(res, Math.pow(2, attempt) * 1000));
      continue;
    }

    if (!response.ok) {
      const message = await handleAirtableError(response, context);
      if ((response.status >= 500 || response.status === 429) && attempt < maxRetries) {
        lastError = new Error(message);
        await new Promise(res => setTimeout(res, Math.pow(2, attempt) * 1000));
        continue;
      }
      throw new Error(message);
    }

    try {
      return await response.json();
    } catch (error) {
      throw new Error('Airtable returned an invalid response payload.', { cause: error });
    }
  }
  throw lastError ?? new Error('Airtable request failed without an error result.');
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

const normalizeObservationRecord = (record: FetchedObservation): FetchedObservation => {
  const normalizedFields = { ...record.fields };
  const aliasField = (primary: string, fallback: string) => {
    if (primary in normalizedFields && !(fallback in normalizedFields)) {
      (normalizedFields as any)[fallback] = (normalizedFields as any)[primary];
    }
    if (fallback in normalizedFields && !(primary in normalizedFields)) {
      (normalizedFields as any)[primary] = (normalizedFields as any)[fallback];
    }
  };

  aliasField('Site/Location', 'Site / Location');
  aliasField('Action Taken', 'Action taken');
  aliasField('Closed By', 'Closed by');
  aliasField('Role/Position', 'Role / Position');

  return { ...record, fields: normalizedFields as FetchedObservation['fields'] };
};

const AIRTABLE_CONTENT_HOST = 'https://content.airtable.com/v0';

/** Creates a single Airtable record and returns its record ID. */
const createRecord = async (
  tableName: string,
  fields: Record<string, unknown>,
  context: { baseId: string; apiKey: string }
): Promise<string> => {
  const url = `https://api.airtable.com/v0/${context.baseId}/${encodeURIComponent(tableName)}`;
  const data = await fetchWithRetry(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${context.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ records: [{ fields }], typecast: true }),
  }, { baseId: context.baseId, tableName });

  const recordId = data?.records?.[0]?.id;
  if (!recordId) {
    throw new Error('Airtable did not return a record ID for the created report.');
  }
  return recordId;
};

/**
 * Primary image pipeline: uploads a binary directly into an Airtable attachment
 * field via the content-upload endpoint, bypassing Firestore/Storage entirely.
 */
const uploadAttachmentDirect = async (
  file: File,
  context: { baseId: string; apiKey: string; recordId: string; fieldName: string }
): Promise<void> => {
  const base64 = await fileToBase64(file);
  const url = `${AIRTABLE_CONTENT_HOST}/${context.baseId}/${context.recordId}/${encodeURIComponent(context.fieldName)}/uploadAttachment`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${context.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contentType: file.type || 'image/jpeg',
      file: base64,
      filename: file.name,
    }),
  });

  if (!response.ok) {
    const message = await handleAirtableError(response, { baseId: context.baseId, tableName: context.fieldName });
    throw new Error(message);
  }
};

/** Reads the current attachment array from a record's field. */
const fetchRecordAttachments = async (
  tableName: string,
  recordId: string,
  fieldName: string,
  context: { baseId: string; apiKey: string }
): Promise<AttachmentData[]> => {
  const url = `https://api.airtable.com/v0/${context.baseId}/${encodeURIComponent(tableName)}/${recordId}`;
  const data = await fetchWithRetry(url, {
    headers: { 'Authorization': `Bearer ${context.apiKey}` },
  }, { baseId: context.baseId, tableName });

  const existing = data?.fields?.[fieldName];
  if (!Array.isArray(existing)) return [];
  return (existing as Array<{ url?: string; filename?: string }>)
    .map(a => ({ url: a?.url ?? '', filename: a?.filename ?? '' }))
    .filter(a => Boolean(a.url));
};

/**
 * Appends externally-hosted attachment URLs to a record's field without
 * discarding attachments already present (e.g. prior direct uploads).
 */
const appendAttachmentsToRecord = async (
  tableName: string,
  recordId: string,
  fieldName: string,
  attachments: AttachmentData[],
  context: { baseId: string; apiKey: string }
): Promise<void> => {
  const existing = await fetchRecordAttachments(tableName, recordId, fieldName, context);
  const merged = [...existing, ...attachments].map(a => ({ url: a.url, filename: a.filename }));
  const url = `https://api.airtable.com/v0/${context.baseId}/${encodeURIComponent(tableName)}/${recordId}`;

  await fetchWithRetry(url, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${context.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { [fieldName]: merged }, typecast: true }),
  }, { baseId: context.baseId, tableName });
};

/**
 * Attaches evidence images to an existing Airtable record.
 *
 * Each image is first attempted via a direct Airtable attachment upload. If a
 * direct upload fails, the image falls back to Firebase (Firestore registry +
 * Storage) and its resulting URL is batched into a single PATCH so successful
 * direct uploads are preserved.
 */
export const attachEvidenceToRecord = async (params: {
  tableName: string;
  recordId: string;
  fieldName: string;
  files: EvidenceFile[];
  config: { baseId: string; apiKey: string };
}): Promise<void> => {
  const { tableName, recordId, fieldName, files, config } = params;
  if (!files || files.length === 0) return;

  const fallbackAttachments: AttachmentData[] = [];

  for (const { file } of files) {
    try {
      await uploadAttachmentDirect(file, {
        baseId: config.baseId,
        apiKey: config.apiKey,
        recordId,
        fieldName,
      });
    } catch (directError) {
      console.warn('Direct Airtable upload failed; engaging Firestore fallback:', directError);
      const attachment = await persistEvidenceFallback(file, {
        tableName,
        fieldName,
        recordId,
        reason: directError instanceof Error ? directError.message : 'direct-upload-failed',
      });
      fallbackAttachments.push(attachment);
    }
  }

  if (fallbackAttachments.length > 0) {
    await appendAttachmentsToRecord(tableName, recordId, fieldName, fallbackAttachments, config);
  }
};

export const OBSERVATION_EVIDENCE_FIELD = 'Open observations';
export const INCIDENT_EVIDENCE_FIELD = 'Attachments';

/** Result of creating a record; carries the config needed to attach evidence. */
export interface CreatedRecord {
  recordId: string;
  tableName: string;
  evidenceField: string;
  config: { baseId: string; apiKey: string };
}

const buildObservationFields = (form: ObservationForm): Record<string, unknown> => {
  const fields: Record<string, unknown> = {};
  // Only include fields that exist in Airtable "Observation Reports" table
  // Confirmed fields: Name, Role / Position, Site / Location, Observation Type,
  // Observation, Action Taken, Assigned To, Closed By, Location, Open observations, Closed observations
  if (form.name?.trim()) fields["Name"] = form.name;
  if (form.role?.trim()) fields["Role / Position"] = form.role;
  if (form.site?.trim()) fields["Site / Location"] = form.site;
  if (form.category?.trim()) fields["Observation Type"] = form.category;
  if (form.observation?.trim()) fields["Observation"] = form.observation;
  if (form.actionTaken?.trim()) fields["Action Taken"] = form.actionTaken;
  if (form.assignedTo?.trim()) fields["Assigned To"] = form.assignedTo;
  if (form.closedBy?.trim()) fields["Closed By"] = form.closedBy;
  if (form.location?.trim()) fields["Location"] = form.location;
  return fields;
};

const buildIncidentFields = (form: IncidentForm): Record<string, unknown> => ({
  "Title": form.title,
  "Description": form.description,
  "Incident Date": `${form.date}T${form.time}:00.000Z`,
  "Location": form.location,
  "Department": form.department,
  "Site / Project": form.site,
  "Device Metadata": form.deviceMetadata || '',
  "Status": INCIDENT_STATUS.PENDING_REVIEW,
  "Severity": form.severityScore,
  "Likelihood": form.likelihoodScore,
  "Category": form.type,
  "Reporter ID": form.reporterName,
  "Persons Involved": form.involvedParties,
  "Equipment Involved": form.equipmentInvolved,
  "Witnesses": form.witnesses,
  "Root Cause": form.rootCause || '',
  "Recommended Controls": form.recommendedControls || '',
  // Workflow Mapping
  "Reviewer": form.reviewer,
  "Review Date": form.reviewDate ? `${form.reviewDate}T00:00:00.000Z` : undefined,
  "Review Comments": form.reviewComments,
  "Corrective Action": form.correctiveAction,
  "Action Assigned To": form.actionAssignedTo,
  "Action Due Date": form.actionDueDate,
  "Verification Comments": form.verificationComments,
  "Closed By": form.closedBy,
  "Closure Date": form.closureDate ? `${form.closureDate}T00:00:00.000Z` : undefined,
});

/**
 * Creates the observation record (text fields only) and returns a handle for
 * attaching evidence. Fast path so the UI can confirm the save instantly and
 * upload images in the background.
 */
export const createObservationRecord = async (form: ObservationForm, configOverride?: AirtableConfigOverride): Promise<CreatedRecord> => {
  const baseId = configOverride?.baseId || AIRTABLE_CONFIG.BASE_ID;
  const apiKey = configOverride?.apiKey || AIRTABLE_CONFIG.API_KEY;
  const tableName = AIRTABLE_CONFIG.TABLES.OBSERVATIONS;
  const recordId = await createRecord(tableName, buildObservationFields(form), { baseId, apiKey });
  return { recordId, tableName, evidenceField: OBSERVATION_EVIDENCE_FIELD, config: { baseId, apiKey } };
};

export const createIncidentRecord = async (form: IncidentForm, configOverride?: AirtableConfigOverride): Promise<CreatedRecord> => {
  const baseId = configOverride?.baseId || AIRTABLE_CONFIG.BASE_ID;
  const apiKey = configOverride?.apiKey || AIRTABLE_CONFIG.API_KEY;
  const tableName = AIRTABLE_CONFIG.TABLES.INCIDENTS;
  const recordId = await createRecord(tableName, buildIncidentFields(form), { baseId, apiKey });
  return { recordId, tableName, evidenceField: INCIDENT_EVIDENCE_FIELD, config: { baseId, apiKey } };
};

export const submitObservationReport = async (form: ObservationForm, evidence: EvidenceFile[], configOverride?: AirtableConfigOverride): Promise<boolean> => {
  const created = await createObservationRecord(form, configOverride);
  await attachEvidenceToRecord({
    tableName: created.tableName,
    recordId: created.recordId,
    fieldName: created.evidenceField,
    files: evidence || [],
    config: created.config,
  });
  return true;
};

export const submitIncidentReport = async (form: IncidentForm, evidence: EvidenceFile[], configOverride?: AirtableConfigOverride): Promise<boolean> => {
  const created = await createIncidentRecord(form, configOverride);
  await attachEvidenceToRecord({
    tableName: created.tableName,
    recordId: created.recordId,
    fieldName: created.evidenceField,
    files: evidence || [],
    config: created.config,
  });
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
  const records = await fetchAllPaginatedRecords<FetchedObservation>(url, apiKey, { baseId, tableName });
  return records.map(normalizeObservationRecord);
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

export const updateObservation = async (recordId: string, fields: object, configOverride?: AirtableConfigOverride): Promise<boolean> => {
  const baseId = configOverride?.baseId || AIRTABLE_CONFIG.BASE_ID;
  const apiKey = configOverride?.apiKey || AIRTABLE_CONFIG.API_KEY;
  const tableName = AIRTABLE_CONFIG.TABLES.OBSERVATIONS;
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
  const filter = `AND({Assigned To}='${userName}', {Action Taken}='')`;
  const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}?filterByFormula=${encodeURIComponent(filter)}`;
  const records = await fetchAllPaginatedRecords<FetchedObservation>(url, apiKey, { baseId, tableName });
  return records.map(normalizeObservationRecord);
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
  // Build a human-readable Critical Failures summary from the failed check keys and remarks
  const failureEntries: string[] = [];
  Object.keys(checks).forEach((k) => {
    if ((checks as any)[k] === 'fail') {
      const m = k.match(/(.+)-([DN])$/);
      const item = m ? m[1] : k;
      const shift = m ? m[2] : '';
      const remark = (remarks && (remarks as any)[item]) ? `: ${(remarks as any)[item]}` : '';
      failureEntries.push(`${item}${shift ? ` (${shift})` : ''}${remark}`);
    }
  });
  const criticalFailures = failureEntries.length ? failureEntries.join('; ') : 'None';

  const fields = {
    "Inspection Date": metadata.date,
    "Inspector Name": metadata.inspector,
    "Crane Type": craneType,
    "Plant Number": metadata.plate,
    "Make and Model": metadata.make,
    "Status": hasFail ? "Grounded" : "Operational",
    "Inspection Data": JSON.stringify({ checks, remarks }),
    "Critical Failures": criticalFailures,
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
  // Build a human-readable Critical Failures summary from the failed check keys and remarks
  const failureEntries: string[] = [];
  Object.keys(checks).forEach((k) => {
    if ((checks as any)[k] === 'fail') {
      const m = k.match(/(.+)-([DN])$/);
      const item = m ? m[1] : k;
      const shift = m ? m[2] : '';
      const remark = (remarks && (remarks as any)[item]) ? `: ${(remarks as any)[item]}` : '';
      failureEntries.push(`${item}${shift ? ` (${shift})` : ''}${remark}`);
    }
  });
  const criticalFailures = failureEntries.length ? failureEntries.join('; ') : 'None';

  const fields = {
    "Inspection Date": metadata.date,
    "Inspector Name": metadata.inspector,
    "Equipment Type": equipmentType,
    "Plant Number": metadata.plate,
    "Make and Model": metadata.make,
    "Status": hasFail ? "Grounded" : "Operational",
    "Inspection Data": JSON.stringify({ checks, remarks }),
    "Critical Failures": criticalFailures,
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
