

// Configuration for the Application
// In a real deployment, these should be environment variables (process.env.REACT_APP_... or import.meta.env.VITE_...)

export const MIN_IMAGES = 1;
export const MAX_IMAGES = 3;

// Helper to safely access env variables
const env = (import.meta as any).env || {};

const envStr = (key: string): string | undefined => {
  const val = env[key];
  if (typeof val !== 'string') return undefined;
  const trimmed = val.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const assertRequiredViteEnv = (requirements: Array<{ key: string; hint: string }>) => {
  const missing = requirements
    .map(r => ({ ...r, value: envStr(r.key) }))
    .filter(r => !r.value);

  if (missing.length === 0) return;

  const missingKeys = missing.map(m => m.key).join(', ');
  const hints = missing.map(m => `- ${m.key}: ${m.hint}`).join('\n');

  throw new Error(
    [
      `CONFIGURATION FAULT: Missing environment variables: ${missingKeys}.`,
      `If deployed on Vercel: Project → Settings → Environment Variables → add the missing keys for Production (and Preview if needed), then redeploy.`,
      `\nRequired values:`,
      hints,
    ].join('\n')
  );
};

export const AIRTABLE_CONFIG = {
  BASE_ID: envStr('VITE_AIRTABLE_BASE_ID'),
  TABLE_NAME: envStr('VITE_AIRTABLE_TABLE_NAME') || 'Observation Reports', 
  INCIDENT_TABLE_NAME: 'Incident Reports',
  CRANE_CHECK_TABLE_NAME: 'Crane Checklists',
  API_KEY: envStr('VITE_AIRTABLE_API_KEY'),
};

export const SUPABASE_CONFIG = {
  URL: envStr('VITE_SUPABASE_URL'),
  ANON_KEY: envStr('VITE_SUPABASE_ANON_KEY'),
  BUCKET_NAME: envStr('VITE_SUPABASE_BUCKET') || 'incident-images',
  TRAINING_BUCKET_NAME: 'training_evidence'
};

// Validate required configuration in production builds.
// In Vercel (and other static hosts), these VITE_ variables must exist at build time.
if (env.PROD) {
  assertRequiredViteEnv([
    { key: 'VITE_AIRTABLE_BASE_ID', hint: "Airtable Base ID like 'appXXXXXXXXXXXXXX' (no /tbl...)" },
    { key: 'VITE_AIRTABLE_API_KEY', hint: 'Airtable Personal Access Token (PAT)' },
    { key: 'VITE_SUPABASE_URL', hint: "Supabase project URL like 'https://<ref>.supabase.co'" },
    { key: 'VITE_SUPABASE_ANON_KEY', hint: 'Supabase anon public key (JWT)' },
  ]);
}

// Application State Keys
export const STORAGE_KEYS = {
  PROFILE: 'hse_guardian_profile',
  THEME: 'hse_guardian_theme',
  LAST_USER: 'hse_guardian_last_user',
  TUTORIAL_SEEN: 'hse_guardian_tutorial_seen',
  COOKIES_ACCEPTED: 'hse_guardian_cookies_accepted'
};

// System Identity
export const SYSTEM_LOGO_URL = 'https://www.multiply-marketing.com/trojan-wp/wp-content/uploads/2020/08/tgc-logo-300x300.png';
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

export const DEPARTMENTS = [
  'HSE',
  'Operations',
  'Logistics',
  'Civil Engineering',
  'Electrical',
  'Mechanical',
  'Administration',
  'Quality Control'
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

export const INCIDENT_TYPES = [
  'Injury / Illness',
  'Property Damage',
  'Environmental Incident',
  'Security Breach',
  'Vehicle Accident',
  'Near Miss (High Potential)',
  'Other'
];

export const SEVERITY_LEVELS = [
  'Minor',
  'Moderate',
  'Major',
  'Critical'
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
