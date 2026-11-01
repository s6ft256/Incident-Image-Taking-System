import { collection, getDocs } from 'firebase/firestore';
import { FetchedObservation, FetchedIncident } from '../types';
import { getFirebaseFirestore } from './firebaseService';

const normalizeObservation = (row: Record<string, any>, id: string): FetchedObservation => ({
  id,
  createdTime: row.created_at || row.createdTime || new Date().toISOString(),
  fields: {
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
  }
});

const normalizeIncident = (row: Record<string, any>, id: string): FetchedIncident => ({
  id,
  createdTime: row.created_at || row.createdTime || new Date().toISOString(),
  fields: {
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
  }
});

const readCollection = async <T>(
  collectionName: string,
  normalize: (data: Record<string, any>, id: string) => T
): Promise<T[]> => {
  const db = getFirebaseFirestore();
  if (!db) return [];
  const snapshot = await getDocs(collection(db, collectionName));
  return snapshot.docs.map(record => normalize(record.data(), record.id));
};

export const getAllFirebaseObservations = async (): Promise<FetchedObservation[]> => {
  try {
    return await readCollection('observations', normalizeObservation);
  } catch (error) {
    console.warn('Firebase observations fetch failed', error);
    return [];
  }
};

export const getAllFirebaseIncidents = async (): Promise<FetchedIncident[]> => {
  try {
    return await readCollection('incidents', normalizeIncident);
  } catch (error) {
    console.warn('Firebase incidents fetch failed', error);
    return [];
  }
};
