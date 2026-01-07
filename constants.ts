
// Configuration for the HSE Guardian Application
// Sensitive values are pulled from environment variables for security compliance.

export const MIN_IMAGES = 1;
export const MAX_IMAGES = 5;

// Robust environment variable access with fallbacks
const getEnv = (key: string, fallback: string): string => {
  // Check Vite's import.meta.env (standard for this project)
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key] as string;
  }
  // Check Node's process.env (fallback for non-Vite contexts)
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] as string;
  }
  return fallback;
};

// Robustly extract Base ID even if a full URL or "base/table" format is provided
const rawAirtableBaseId = getEnv('VITE_AIRTABLE_BASE_ID', '');
const extractBaseId = (input: string): string => {
  // Regex to find "app" followed by alphanumeric characters (standard Airtable Base ID format)
  const match = input.match(/app[a-zA-Z0-9]{14,}/);
  return match ? match[0] : input.split('/')[0];
};

export const AIRTABLE_CONFIG = {
  BASE_ID: extractBaseId(rawAirtableBaseId),
  TABLES: {
    // Using the specific Table ID provided by the user for Incident Reports for guaranteed linkage
    OBSERVATIONS: 'Observation Reports', 
    INCIDENTS: 'tbl71CMWMa1qDm8I7', // Table ID required for this specific Airtable Base
    CRANE_CHECKS: 'Crane Checklists',
    EQUIPMENT_CHECKS: 'Equipment Checklists',
    TRAINING: 'Training Roster'
  },
  // Updated with the provided Airtable Personal Access Token
  API_KEY: getEnv('VITE_AIRTABLE_API_KEY', ''),
};

export const SUPABASE_CONFIG = {
  URL: getEnv('VITE_SUPABASE_URL', '').trim(),
  ANON_KEY: getEnv('VITE_SUPABASE_ANON_KEY', '').trim(),
  BUCKET_NAME: getEnv('VITE_SUPABASE_BUCKET', 'incident-images'),
};

export const STORAGE_KEYS = {
  PROFILE: 'hse_guardian_profile',
  THEME: 'hse_guardian_theme',
  LAST_USER: 'hse_guardian_last_user',
  TUTORIAL_SEEN: 'hse_guardian_tutorial_seen',
  COOKIES_ACCEPTED: 'hse_guardian_cookies_accepted'
};

export const ARCHIVE_ACCESS_KEY = getEnv('VITE_ARCHIVE_ACCESS_KEY', '');
export const SYSTEM_LOGO_URL = 'https://www.multiply-marketing.com/trojan-wp/wp-content/uploads/2020/08/tgc-logo-300x300.png';

export const INCIDENT_STATUS = {
  PENDING_REVIEW: 'Pending Review',
  ACTION_PENDING: 'Action Pending',
  VERIFICATION_PENDING: 'Verification Pending',
  CLOSED: 'Closed'
};

export const SEVERITY_LEVELS: { [key: number]: string } = {
  1: 'Insignificant',
  2: 'Minor',
  3: 'Moderate',
  4: 'Major',
  5: 'Catastrophic'
};

export const LIKELIHOOD_LEVELS: { [key: number]: string } = {
  1: 'Rare',
  2: 'Unlikely',
  3: 'Possible',
  4: 'Likely',
  5: 'Almost Certain'
};

export const ROLES = ['Site Supervisor', 'Safety Officer', 'Engineer', 'Technician', 'Contractor', 'Visitor', 'HSSE Manager'];
export const DEPARTMENTS = ['HSE', 'Operations', 'Logistics', 'Civil Engineering', 'Electrical', 'Mechanical', 'Quality Control'];
export const SITES = ['Headquarters', 'Warehouse A', 'Construction Site North', 'Construction Site South', 'Remote Facility'];
export const OBSERVATION_TYPES = ['Unsafe Act', 'Unsafe Condition', 'Near Miss', 'Positive Observation', 'Environmental Risk', 'Equipment Failure'];
export const AUTHORIZED_ADMIN_ROLES = ['hsse manager', 'safety officer', 'site supervisor', 'engineer'];
export const INCIDENT_TYPES = ['Medical Treatment', 'First Aid', 'Lost Time Injury', 'Property Damage', 'Near Miss', 'Environmental Incident', 'Fire / Explosion', 'Vehicle Accident'];

export const getRiskLevel = (score: number): { level: string; color: string; textColor: string; } => {
  if (score >= 15) return { level: 'CRITICAL', color: 'bg-rose-600', textColor: 'text-rose-500' };
  if (score >= 9) return { level: 'HIGH', color: 'bg-amber-500', textColor: 'text-amber-500' };
  if (score >= 4) return { level: 'MEDIUM', color: 'bg-yellow-500', textColor: 'text-yellow-500' };
  return { level: 'LOW', color: 'bg-emerald-500', textColor: 'text-emerald-500' };
};

export const SAFETY_QUOTES = [
  "Safety is not a gadget, but a state of mind.",
  "The best safety device is a careful worker.",
  "Working safely may get old, but so do those who practice it.",
  "Safety starts with me."
];
