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
 * Creates a record in Airtable.
 */
export const submitIncidentReport = async (
  form: IncidentForm, 
  images: AttachmentData[], 
  configOverride?: AirtableConfigOverride
): Promise<boolean> => {
  // Use override if provided, otherwise fall back to constants
  const BASE_ID = configOverride?.baseId || AIRTABLE_CONFIG.BASE_ID;
  const API_KEY = configOverride?.apiKey || AIRTABLE_CONFIG.API_KEY;
  const TABLE_NAME = AIRTABLE_CONFIG.TABLE_NAME;

  if (!BASE_ID || !API_KEY) {
    throw new Error("Airtable Configuration Missing. Base ID or API Key is empty.");
  }

  const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE_NAME)}`;

  // Prepare attachments array for Airtable
  const evidenceAttachments = images.map(img => ({ 
    url: img.url,
    filename: img.filename 
  }));

  // Map form data to the exact column names in Airtable
  const record: IncidentRecord = {
    fields: {
      "Name": form.name,
      "Role / Position": form.role,
      "Site / Location": form.site,
      "Incident Type": form.category,
      "Observation": form.observation,
      "Action taken": form.actionTaken,
      // Only include Open observations field if there are images
      ...(evidenceAttachments.length > 0 && { "Open observations": evidenceAttachments })
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        records: [record],
        typecast: true 
      })
    });

    if (!response.ok) {
      let errorData: any;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { error: 'Could not parse server response' };
      }
      
      console.error('Airtable API Error Detail:', JSON.stringify(errorData, null, 2));
      
      let details = '';
      if (errorData?.error) {
        if (typeof errorData.error === 'string') {
          details = errorData.error;
          if (errorData.message) details += `: ${errorData.message}`;
        } else if (typeof errorData.error === 'object') {
          details = errorData.error.message || errorData.error.type || JSON.stringify(errorData.error);
        }
      }
      
      if (!details) {
        details = response.statusText || 'Unknown Server Error';
      }

      if (response.status === 401) throw new Error(`Authentication Failed (401). Check API Key.`);
      if (response.status === 403) throw new Error(`Permission Denied (403). Check permissions.`);
      if (response.status === 404) throw new Error(`Not Found (404). Check Base ID and Table Name.`);
      
      // Pass the actual error details for 422 to help debug field names
      if (response.status === 422) {
        throw new Error(`Validation Error (422): ${details}`);
      }
      
      throw new Error(`Submission failed (${response.status}): ${details}`);
    }

    return true;
  } catch (error: any) {
    console.error('Network or Logic Error:', error);
    throw error;
  }
};

/**
 * Updates the 'Action taken' and 'Closed observations' field of a specific report.
 */
export const updateIncidentAction = async (
  recordId: string,
  actionTaken: string,
  closingImages: AttachmentData[] = [],
  configOverride?: AirtableConfigOverride
): Promise<boolean> => {
  const BASE_ID = configOverride?.baseId || AIRTABLE_CONFIG.BASE_ID;
  const API_KEY = configOverride?.apiKey || AIRTABLE_CONFIG.API_KEY;
  const TABLE_NAME = AIRTABLE_CONFIG.TABLE_NAME;

  if (!BASE_ID || !API_KEY) throw new Error("Airtable Configuration Missing.");

  const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE_NAME)}/${recordId}`;

  const fieldsToUpdate: any = {
    "Action taken": actionTaken
  };

  if (closingImages.length > 0) {
    fieldsToUpdate["Closed observations"] = closingImages.map(img => ({
      url: img.url,
      filename: img.filename
    }));
  }

  try {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: fieldsToUpdate
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Update failed:", errorText);
      throw new Error(`Failed to update report: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error('Error updating report:', error);
    throw error;
  }
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

  if (!BASE_ID || !API_KEY) {
    throw new Error("Airtable Configuration Missing.");
  }

  // Formula: Created Time is after (Now - 1 day)
  const formula = `IS_AFTER(CREATED_TIME(), DATEADD(NOW(), -1, 'days'))`;
  
  const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE_NAME)}?filterByFormula=${encodeURIComponent(formula)}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch reports: ${response.statusText}`);
    }

    const data = await response.json();
    const records = data.records as FetchedIncident[];

    // Client-side sort: Newest first
    return records.sort((a, b) => 
      new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime()
    );
  } catch (error) {
    console.error('Error fetching recent reports:', error);
    throw error;
  }
};

/**
 * Fetches a larger set of recent reports (max 100) for dashboard statistics.
 * Does not restrict to 24 hours.
 * Uses client-side sorting to avoid errors if a "Created" field doesn't exist.
 */
export const getAllReports = async (
  configOverride?: AirtableConfigOverride
): Promise<FetchedIncident[]> => {
  const BASE_ID = configOverride?.baseId || AIRTABLE_CONFIG.BASE_ID;
  const API_KEY = configOverride?.apiKey || AIRTABLE_CONFIG.API_KEY;
  const TABLE_NAME = AIRTABLE_CONFIG.TABLE_NAME;

  if (!BASE_ID || !API_KEY) {
    throw new Error("Airtable Configuration Missing.");
  }

  // Fetch last 100 records (by default order)
  // Removed explicit server-side sort to prevent "Unknown field name" errors.
  const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE_NAME)}?maxRecords=100`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      }
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Dashboard fetch failed:", errorText);
        throw new Error(`Failed to fetch dashboard data: ${response.statusText}`);
    }

    const data = await response.json();
    const records = data.records as FetchedIncident[];
    
    // Client-side sort: Newest first using the system createdTime
    return records.sort((a, b) => 
      new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime()
    );
  } catch (error) {
    console.error('Error fetching dashboard reports:', error);
    // Return empty array instead of throwing to prevent dashboard crash
    return [];
  }
};