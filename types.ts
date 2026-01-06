
export interface UserProfile {
  id?: string;
  name: string;
  role: string;
  site?: string;
  email?: string; 
  profileImageUrl?: string;
  password?: string;
  biometricCredentialId?: string; 
  // Compliance Fields
  privacy_policy_consent?: boolean;
  user_agreement_consent?: boolean;
  image_consent?: boolean;
  consent_timestamp?: string;
}

export interface IncidentForm {
  title: string;
  type: string;
  severityScore: number;
  likelihoodScore: number;
  date: string;
  time: string;
  location: string;
  site: string;
  deviceMetadata?: string;
  department: string;
  description: string;
  involvedParties: string;
  equipmentInvolved: string;
  witnesses: string;
  rootCause: string;
  recommendedControls: string;
  reporterName: string;
  // Workflow & Resolution Fields
  reviewer: string;
  reviewDate: string;
  reviewComments: string;
  correctiveAction: string;
  actionAssignedTo: string;
  actionDueDate: string;
  verificationComments: string;
  closedBy: string;
  closureDate: string;
}

export interface OfflineIncident {
  id: string;
  form: IncidentForm;
  images: {
    id: string;
    file: File;
    isAnnotated?: boolean;
  }[];
  timestamp: number;
}

export interface FetchedIncident {
  id: string;
  createdTime: string;
  fields: {
    "Title": string;
    "Description": string;
    "Incident Date": string;
    "Location": string;
    "Department": string;
    "Site / Project"?: string;
    "Device Metadata"?: string;
    "Status": 'Pending Review' | 'Action Pending' | 'Verification Pending' | 'Closed';
    "Severity": number;
    "Likelihood"?: number;
    "Risk Level"?: number;
    "Category": string;
    "Reporter ID": string;
    "Persons Involved"?: string;
    "Equipment Involved"?: string;
    "Witnesses"?: string;
    "Root Cause"?: string;
    "Recommended Controls"?: string;
    "Image URLs"?: string;
    "Attachments"?: Array<{ url: string; filename: string }>;
    "Geolocation"?: string;
    "Metadata"?: string;
    // Workflow Fields
    "Reviewer"?: string;
    "Review Date"?: string;
    "Review Comments"?: string;
    "Corrective Action"?: string;
    "Action Assigned To"?: string;
    "Action Due Date"?: string;
    "Verification Comments"?: string;
    "Verification Photos"?: Array<{ url: string; filename: string }>;
    "Closed By"?: string;
    "Closure Date"?: string;
  };
}

export interface FetchedCraneChecklist {
  id: string;
  createdTime: string;
  fields: {
    "Inspection Date": string;
    "Inspector Name": string;
    "Crane Type": string;
    "Plant Number": string;
    "Make and Model": string;
    "Status": "Operational" | "Grounded";
    "Critical Failures"?: string;
    "Remarks"?: string;
    "Inspection Data": string;
    "Image"?: Array<{ url: string; filename: string }>;
  };
}

export interface FetchedEquipmentChecklist {
  id: string;
  createdTime: string;
  fields: {
    "Inspection Date": string;
    "Inspector Name": string;
    "Equipment Type": string;
    "Plant Number": string;
    "Make and Model": string;
    "Status": "Operational" | "Grounded";
    "Critical Failures"?: string;
    "Remarks"?: string;
    "Inspection Data": string;
    "Image"?: Array<{ url: string; filename: string }>;
  };
}

export interface ObservationForm {
  name: string;
  role: string;
  site: string;
  category: string;
  observation: string;
  actionTaken: string;
  assignedTo?: string;
  location?: string; 
  rootCause?: string; 
  closedBy?: string;
  correctiveActionPlan?: string; 
}

export interface ObservationRecord {
  fields: {
    "Name": string;
    "Role/Position"?: string;
    "Role / Position"?: string;
    "Site/Location"?: string;
    "Site / Location"?: string;
    "Observation Type"?: string;
    "Observation": string;
    "Action Taken"?: string;
    "Action taken"?: string;
    "Closed by"?: string;
    "Closed By"?: string;
    "Assigned To"?: string;
    "Location"?: string; 
    "Root Cause"?: string;
    "Attachments"?: Array<{ 
      url: string; 
      filename?: string; 
    }>;
    "Closed observations"?: Array<{ 
      url: string; 
      filename?: string; 
    }>;
  }
}

export interface FetchedObservation {
  id: string;
  createdTime: string;
  fields: {
    "Name": string;
    "Role/Position"?: string;
    "Role / Position"?: string;
    "Site/Location"?: string;
    "Site / Location"?: string;
    "Observation Type"?: string;
    "Observation": string;
    "Action Taken"?: string;
    "Action taken"?: string;
    "Closed by"?: string;
    "Closed By"?: string;
    "Assigned To"?: string;
    "Location"?: string; 
    "Root Cause"?: string;
    "Attachments"?: Array<{ 
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
  serverUrl?: string; 
  status: 'pending' | 'uploading' | 'success' | 'error' | 'analyzing';
  progress: number;
  errorMessage?: string;
  isAnnotated?: boolean;
}

export interface HazardRow {
  id: string;
  step: string;
  hazard: string;
  consequences: string;
  personsAtRisk: string;
  existingControls: string;
  likelihood: number;
  severity: number;
  rating: number;
  additionalControls: string;
  controlType: string;
  responsiblePerson: string;
  targetDate: string;
  residualRating: number;
  status: 'Open' | 'Closed';
}

export interface RiskAssessment {
  id: string;
  companyName: string;
  department: string;
  title: string;
  refNumber: string;
  site: string;
  taskActivity: string;
  assessmentDate: string;
  reviewDate: string;
  versionNumber: string;
  assessorName: string;
  assessorPosition: string;
  approverName: string;
  scopeDescription: string;
  equipmentInvolved: string;
  areaProcess: string;
  workersInvolved: string;
  personsAtRisk: string[];
  ppeRequirements: string[];
  hazardTable: HazardRow[];
  emergencyProcedures: string;
  firstAidArrangements: string;
  fireResponse: string;
  spillResponse: string;
  emergencyContacts: string;
  medicalFacility: string;
  trainingCertifications: string;
  tbtConducted: string;
  inductionCompleted: boolean;
  environmentalWaste: string;
  environmentalNoise: string;
  environmentalDust: string;
  environmentalChemical: string;
  environmentalPollution: string;
  monitoringFrequency: string;
  monitoringTriggers: string;
  monitoringComments: string;
  assessorSigned: boolean;
  supervisorSigned: boolean;
  workerSignatures: { name: string; signed: boolean }[];
}

export interface TraineeRow {
  id: string;
  name: string;
  companyNo: string;
  designation: string;
  isSigned: boolean;
  signTimestamp?: string;
}

export interface ComplianceRequirement {
  id: string;
  clause: string;
  description: string;
  method: string;
  responsible: string;
  frequency: 'One-time' | 'Monthly' | 'Annual' | 'Ongoing';
  nextDueDate: string;
  status: 'Compliant' | 'Partially Compliant' | 'Non-Compliant' | 'Not Applicable';
}

export interface ComplianceRecord {
  id: string;
  createdDate: string;
  createdBy: string;
  standardName: string;
  code: string;
  authority: string;
  jurisdiction: string;
  category: string;
  regStatus: 'Draft' | 'Active' | 'Superseded';
  applicableSites: string[];
  applicableProjects: string[];
  applicableActivities: string;
  personsAffected: string[];
  requirements: ComplianceRequirement[];
  evidenceRequired: string;
  evidenceType: 'Permit' | 'Training' | 'Inspection' | 'Certificate';
  verifiedBy: string;
  verificationDate: string;
  correctiveActionRequired: boolean;
  correctiveActionDesc?: string;
  correctiveResponsible?: string;
  correctiveTargetDate?: string;
  riskImpact?: string;
  interimControls?: string;
  riskSeverity?: 'Low' | 'Medium' | 'High';
  actionStatus: 'Open' | 'Closed';
  lastReviewDate: string;
  nextReviewDate: string;
  reviewerName: string;
  reviewComments: string;
  isConfirmed: boolean;
  assessorSigned: boolean;
  approverSigned: boolean;
  approvalDate: string;
}

export interface AuditChange {
  fieldName: string;
  previousValue: string;
  newValue: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  user: string;
  userRole: string;
  department: string;
  ipAddress: string;
  deviceBrowser: string;
  action: string;
  module: 'Risk Assessment' | 'Compliance' | 'Incident' | 'Inspection' | 'Other';
  relatedRecordId?: string;
  actionCategory: 'Data Entry' | 'Approval' | 'Review' | 'System Action';
  source: 'Mobile' | 'Web' | 'System';
  actionSummary: string;
  detailedDescription?: string;
  changes?: AuditChange[];
  evidence?: {
    type: string;
    refId: string;
    filename: string;
    url: string;
  };
  reasonForChange?: string;
  approvedBy?: string;
  hash: string;
  previousHash: string;
  tamperStatus: 'Valid' | 'Compromised';
  auditStatus: 'Active' | 'Archived';
  reviewedBy?: string;
  reviewDate?: string;
  reviewNotes?: string;
}
