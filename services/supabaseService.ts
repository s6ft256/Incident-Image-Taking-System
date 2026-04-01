import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from '../constants';
import { FetchedObservation, FetchedIncident } from '../types';

const isSupabaseAvailable = SUPABASE_CONFIG.URL && SUPABASE_CONFIG.ANON_KEY;
const supabase = isSupabaseAvailable ? createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.ANON_KEY) : null;

const handleSupabaseError = (error: any): string => {
  if (!error) return 'Unknown Supabase database fault.';
  if (error.code === '42P01') return 'Registry table missing in Supabase.';
  if (error.message?.includes('JWT')) return 'Supabase session expired. Please refresh.';
  return error.message || 'Supabase data retrieval failed.';
};

const checkSupabase = () => {
  if (!supabase) {
    throw new Error('CONFIGURATION FAULT: Supabase registry not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
};

const normalizeSupabaseObservation = (row: any): FetchedObservation => {
  const fields = {
    'Name': row.name || row.reporter_name || '',
    'Role / Position': row.role ?? row.role_position ?? '',
    'Site / Location': row.site ?? row.location ?? '',
    'Observation Type': row.category ?? row.observation_type ?? '',
    'Observation': row.description ?? row.observation ?? '',
    'Action Taken': row.action_taken ?? '',
    'Assigned To': row.assigned_to ?? '',
    'Closed By': row.closed_by ?? '',
    'Location': row.location ?? '',
    'Root Cause': row.root_cause ?? '',
    'Attachments': row.attachments ?? []
  };

  return {
    id: row.id ? String(row.id) : `sb-obs-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdTime: row.created_at || row.createdTime || new Date().toISOString(),
    fields
  };
};

const normalizeSupabaseIncident = (row: any): FetchedIncident => {
  const fields = {
    'Title': row.title || row.name || '',
    'Description': row.description || '',
    'Incident Date': row.incident_date || row.date || '',
    'Location': row.location || '',
    'Department': row.department || '',
    'Site / Project': row.site ?? '',
    'Status': row.status ?? 'Pending Review',
    'Severity': row.severity ?? 0,
    'Likelihood': row.likelihood ?? 0,
    'Category': row.category ?? '',
    'Reporter ID': row.reporter_id ?? row.reporter_name ?? '',
    'Persons Involved': row.persons_involved ?? '',
    'Equipment Involved': row.equipment_involved ?? '',
    'Witnesses': row.witnesses ?? '',
    'Root Cause': row.root_cause ?? '',
    'Recommended Controls': row.recommended_controls ?? '',
    'Closed By': row.closed_by ?? '',
    'Closure Date': row.closure_date || '',
    'Review Date': row.review_date || '',
    'Review Comments': row.review_comments || '',
    'Corrective Action': row.corrective_action || '',
    'Action Assigned To': row.action_assigned_to || '',
    'Action Due Date': row.action_due_date || '',
    'Verification Comments': row.verification_comments || '',
    'Verification Photos': row.verification_photos ?? [],
    'Attachments': row.attachments ?? []
  };

  return {
    id: row.id ? String(row.id) : `sb-inc-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdTime: row.created_at || row.createdTime || new Date().toISOString(),
    fields
  };
};

export const getAllSupabaseObservations = async (): Promise<FetchedObservation[]> => {
  try {
    checkSupabase();
    const { data, error } = await supabase!.from('observations').select('*');
    if (error) throw new Error(handleSupabaseError(error));
    if (!Array.isArray(data)) return [];
    return data.map(normalizeSupabaseObservation);
  } catch (error) {
    console.warn('Supabase observations fetch failed', error);
    return [];
  }
};

export const getAllSupabaseIncidents = async (): Promise<FetchedIncident[]> => {
  try {
    checkSupabase();
    const { data, error } = await supabase!.from('incidents').select('*');
    if (error) throw new Error(handleSupabaseError(error));
    if (!Array.isArray(data)) return [];
    return data.map(normalizeSupabaseIncident);
  } catch (error) {
    console.warn('Supabase incidents fetch failed', error);
    return [];
  }
};
