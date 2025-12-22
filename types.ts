
export interface UserProfile {
  id?: string;
  name: string;
  role: string;
  site?: string;
  profileImageUrl?: string;
  password?: string;
  // Compliance Fields
  privacy_policy_consent?: boolean;
  user_agreement_consent?: boolean;
  image_consent?: boolean;
  consent_timestamp?: string;
}

export interface IncidentForm {
  name: string;
  role: string;
  site: string;
  category: string;
  observation: string;
  actionTaken: string;
  assignedTo?: string;
  location?: string; // New field for GPS/Precise location
}

export interface IncidentRecord {
  fields: {
    "Name": string;
    "Role / Position": string;
    "Site / Location": string;
    "Incident Type"?: string;
    "Observation": string;
    "Action taken": string;
    "Closed by"?: string;
    "Assigned To"?: string;
    "Location"?: string; // New field mapped to Airtable "Location"
    "Open observations"?: Array<{ 
      url: string; 
      filename?: string; 
    }>;
    "Closed observations"?: Array<{ 
      url: string; 
      filename?: string; 
    }>;
  }
}

export interface FetchedIncident {
  id: string;
  createdTime: string;
  fields: {
    "Name": string;
    "Role / Position": string;
    "Site / Location": string;
    "Incident Type"?: string;
    "Observation": string;
    "Action taken": string;
    "Closed by"?: string;
    "Assigned To"?: string;
    "Location"?: string; // New field
    "Open observations"?: Array<{ 
      url: string; 
      filename: string;
      thumbnails?: {
        small: { url: string; width: number; height: number };
        large: { url: string; width: number; height: number };
      };
    }>;
    "Closed observations"?: Array<{ 
      url: string; 
      filename: string;
      thumbnails?: {
        small: { url: string; width: number; height: number };
        large: { url: string; width: number; height: number };
      };
    }>;
  };
}

export interface UploadedImage {
  id: string;
  file: File;
  previewUrl: string;
  serverUrl?: string; // URL returned from storage server (S3/Cloudinary)
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  errorMessage?: string; // Specific error feedback
}
