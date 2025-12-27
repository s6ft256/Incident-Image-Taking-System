
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

export interface TrainingRecord {
  id: string;
  personnelName: string;
  courseName: string;
  dateCompleted: string;
  expiryDate: string;
  status: 'valid' | 'expiring' | 'expired';
}

export interface TraineeRow {
  id: string;
  name: string;
  companyNo: string;
  designation: string;
  isSigned: boolean;
  signTimestamp?: string;
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
  category: 'Safety' | 'Health' | 'Environment' | 'Fire' | 'Electrical';
  regStatus: 'Active' | 'Superseded' | 'Draft';
  applicableSites: string[];
  applicableProjects: string[];
  applicableActivities: string;
  personsAffected: string[];
  requirements: ComplianceRequirement[];
  evidenceRequired: string;
  evidenceType: 'Permit' | 'Training' | 'Inspection' | 'Certificate';
  evidenceExpiry?: string;
  verifiedBy: string;
  verificationDate: string;
  riskImpact?: string;
  riskSeverity?: 'Low' | 'Medium' | 'High';
  interimControls?: string;
  correctiveActionRequired: boolean;
  correctiveActionDesc?: string;
  correctiveResponsible?: string;
  correctiveTargetDate?: string;
  actionStatus: 'Open' | 'In Progress' | 'Closed';
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
  action: string; // Event Type
  module: 'Risk Assessment' | 'Compliance' | 'Incident' | 'Inspection' | 'Other';
  relatedRecordId: string;
  actionCategory: 'Data Entry' | 'Approval' | 'Review' | 'System Action';
  source: 'Web' | 'Mobile' | 'API' | 'Automated Job';
  actionSummary: string;
  detailedDescription?: string;
  changes?: AuditChange[];
  evidence?: {
    type: 'Document' | 'Image' | 'Certificate' | 'Signature';
    refId: string;
    filename: string;
    url: string;
  };
  reasonForChange?: string;
  approvedBy?: string;
  hash: string;
  previousHash: string;
  tamperStatus: 'Valid' | 'Flagged';
  auditStatus: 'Active' | 'Archived';
  reviewedBy?: string;
  reviewDate?: string;
  reviewNotes?: string;
}

export interface RiskAssessment {
  id: string;
  // Section 1
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
  approverSigned: boolean;
  // Section 2
  scopeDescription: string;
  equipmentInvolved: string;
  areaProcess: string;
  workersInvolved: string;
  // Section 3
  personsAtRisk: string[];
  // Section 4
  hazardTable: HazardRow[];
  // Section 7
  emergencyProcedures: string;
  firstAidArrangements: string;
  fireResponse: string;
  spillResponse: string;
  emergencyContacts: string;
  medicalFacility: string;
  // Section 8
  ppeRequirements: string[];
  // Section 9
  trainingCertifications: string;
  tbtConducted: string;
  inductionCompleted: boolean;
  // Section 10
  environmentalWaste: string;
  environmentalNoise: string;
  environmentalDust: string;
  environmentalChemical: string;
  environmentalPollution: string;
  // Section 11
  monitoringFrequency: string;
  monitoringTriggers: string;
  monitoringComments: string;
  // Section 12
  declarationComments: string;
  assessorSigned: boolean;
  supervisorSigned: boolean;
  workerSignatures: { name: string; signed: boolean }[];
  dateCreated: string;
  status: 'Draft' | 'Approved' | 'Review Required';
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  module: string;
  details: string;
}

export interface ComplianceStandard {
  id: string;
  clause: string;
  requirement: string;
  status: 'compliant' | 'non-compliant' | 'not-applicable';
  evidenceLink?: string;
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
  correctiveActionPlan?: string; 
}

export interface ObservationRecord {
  fields: {
    "Name": string;
    "Role / Position": string;
    "Site / Location": string;
    "Observation Type"?: string;
    "Observation": string;
    "Action taken": string;
    "Closed by"?: string;
    "Assigned To"?: string;
    "Location"?: string; 
    "Root Cause"?: string;
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

export interface FetchedObservation {
  id: string;
  createdTime: string;
  fields: {
    "Name": string;
    "Role / Position": string;
    "Site / Location": string;
    "Observation Type"?: string;
    "Observation": string;
    "Action taken": string;
    "Closed by"?: string;
    "Assigned To"?: string;
    "Location"?: string; 
    "Root Cause"?: string;
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
  serverUrl?: string; 
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  errorMessage?: string; 
}
