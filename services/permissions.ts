// Role-based access control for HSE safety personnel.
//
// The application is accessible to five canonical safety roles. Each role maps
// to a distinct set of permissions that gate the workflows exposed in the UI.
// Legacy free-form role strings (e.g. "HSSE Manager", "Safety Officer") are
// normalized onto these canonical roles so existing profiles keep working.

export type SafetyRole = 'manager' | 'engineer' | 'officer' | 'inspector' | 'assistant';

export type Permission =
  | 'submit-observation'
  | 'submit-incident'
  | 'submit-checklist'
  | 'review-report'
  | 'assign-action'
  | 'verify-closure'
  | 'manage-personnel'
  | 'view-audit-log'
  | 'view-escalations'
  | 'export-data';

export const SAFETY_ROLES: { id: SafetyRole; label: string }[] = [
  { id: 'manager', label: 'Manager' },
  { id: 'engineer', label: 'Engineer' },
  { id: 'officer', label: 'Officer' },
  { id: 'inspector', label: 'Inspector' },
  { id: 'assistant', label: 'Assistant' },
];

const ROLE_PERMISSIONS: Record<SafetyRole, Permission[]> = {
  manager: [
    'submit-observation',
    'submit-incident',
    'submit-checklist',
    'review-report',
    'assign-action',
    'verify-closure',
    'manage-personnel',
    'view-audit-log',
    'view-escalations',
    'export-data',
  ],
  engineer: [
    'submit-observation',
    'submit-incident',
    'submit-checklist',
    'review-report',
    'assign-action',
    'verify-closure',
    'view-audit-log',
    'view-escalations',
    'export-data',
  ],
  officer: [
    'submit-observation',
    'submit-incident',
    'submit-checklist',
    'review-report',
    'assign-action',
    'verify-closure',
    'view-escalations',
    'export-data',
  ],
  inspector: [
    'submit-observation',
    'submit-incident',
    'submit-checklist',
    'review-report',
    'export-data',
  ],
  assistant: [
    'submit-observation',
    'submit-checklist',
  ],
};

// Maps legacy / free-form role labels onto the canonical safety roles.
const LEGACY_ROLE_ALIASES: Record<string, SafetyRole> = {
  'hsse manager': 'manager',
  'hse manager': 'manager',
  'safety manager': 'manager',
  'site supervisor': 'manager',
  'supervisor': 'manager',
  'safety officer': 'officer',
  'hse officer': 'officer',
  'safety engineer': 'engineer',
  'technician': 'assistant',
  'contractor': 'assistant',
  'visitor': 'assistant',
};

/**
 * Resolves any role string (canonical, legacy, or free-form) to a canonical
 * SafetyRole. Unknown roles default to the most restricted role ("assistant").
 */
export const normalizeRole = (role?: string | null): SafetyRole => {
  const value = (role || '').trim().toLowerCase();
  if (!value) return 'assistant';

  if (value in ROLE_PERMISSIONS) return value as SafetyRole;
  if (value in LEGACY_ROLE_ALIASES) return LEGACY_ROLE_ALIASES[value];

  // Heuristic fallback for descriptive titles (e.g. "Senior Safety Inspector").
  if (value.includes('manager')) return 'manager';
  if (value.includes('engineer')) return 'engineer';
  if (value.includes('inspect')) return 'inspector';
  if (value.includes('officer') || value.includes('safety')) return 'officer';
  return 'assistant';
};

/** Returns the full permission set granted to the given role. */
export const getPermissions = (role?: string | null): Permission[] =>
  ROLE_PERMISSIONS[normalizeRole(role)];

/** Returns true when the given role is granted the requested permission. */
export const can = (role: string | null | undefined, permission: Permission): boolean =>
  getPermissions(role).includes(permission);

/** Human-readable label for a role string. */
export const roleLabel = (role?: string | null): string => {
  const canonical = normalizeRole(role);
  return SAFETY_ROLES.find(r => r.id === canonical)?.label ?? 'Assistant';
};
