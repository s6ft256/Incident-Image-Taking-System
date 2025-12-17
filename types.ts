export interface IncidentForm {
  name: string;
  role: string;
  site: string;
  category: string;
  observation: string;
  actionTaken: string;
}

export interface IncidentRecord {
  fields: {
    "Name": string;
    "Role / Position": string;
    "Site / Location": string;
    "Incident Type"?: string;
    "Observation": string;
    "Action taken": string;
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
}