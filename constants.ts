
// Configuration for the Application
// In a real deployment, these should be environment variables (process.env.REACT_APP_... or import.meta.env.VITE_...)

export const MIN_IMAGES = 1;
export const MAX_IMAGES = 3;

// Helper to safely access env variables
const env = (import.meta as any).env || {};

export const AIRTABLE_CONFIG = {
  BASE_ID: env.VITE_AIRTABLE_BASE_ID || 'appRNHMjdLKpotlNB', 
  TABLE_NAME: env.VITE_AIRTABLE_TABLE_NAME || 'Table 1', 
  API_KEY: env.VITE_AIRTABLE_API_KEY || 'patzdxvHRVZMXIn81.9401a5088becb5599f3f531389524760891c53b976331a7cc70876727f8dfb7f',
};

export const SUPABASE_CONFIG = {
  URL: env.VITE_SUPABASE_URL || 'https://irsjpzbbpqsgrqdhanbz.supabase.co',
  ANON_KEY: env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_fdkJTt-jW25th7SdQ0g9QQ_vAYpY-U2', 
  BUCKET_NAME: env.VITE_SUPABASE_BUCKET || 'incident-images'
};

// Application State Keys
export const STORAGE_KEYS = {
  PROFILE: 'hse_guardian_profile',
  THEME: 'hse_guardian_theme',
  LAST_USER: 'hse_guardian_last_user',
  TUTORIAL_SEEN: 'hse_guardian_tutorial_seen',
  COOKIES_ACCEPTED: 'hse_guardian_cookies_accepted'
};

// System Identity
export const SYSTEM_LOGO_URL = 'https://procurement.trojanholding.ae/Styles/Images/TCG.PNG';
export const AUTHORIZED_ADMIN_ROLES = ['technician', 'engineer'];

export const ROLES = [
  'Site Supervisor',
  'Safety Officer',
  'Engineer',
  'Technician',
  'Contractor',
  'Visitor',
  'Other'
];

export const SITES = [
  'Headquarters',
  'Warehouse A',
  'Warehouse B',
  'Construction Site North',
  'Construction Site South',
  'Remote Facility',
  'Other'
];

export const OBSERVATION_TYPES = [
  'Respiratory Hazard',
  'Unsafe Act',
  'Unsafe Condition',
  'Near Miss',
  'Fire Risk',
  'Chemical Spill',
  'Equipment Failure',
  'Environmental',
  'Other'
];

export const SAFETY_QUOTES = [
  "Safety is not a gadget, but a state of mind.",
  "The best safety device is a careful worker.",
  "If you think safety is expensive, try an accident.",
  "Working safely may get old, but so do those who practice it.",
  "There are no shortcuts to safety.",
  "Safety doesn’t happen by accident.",
  "Safety starts with me.",
  "The right thing to do is always the safe thing to do.",
  "Production may win today, but safety wins every day.",
  "A safe workplace is everyone’s responsibility."
];
