import { addDoc, collection, getDocs, orderBy, query, Timestamp } from 'firebase/firestore';
import { TraineeRow } from '../types';
import { getFirebaseFirestore } from './firebaseService';

export interface TrainingSessionData {
  id?: string;
  projectName: string;
  locationText: string;
  gpsCoordinates?: string;
  contractor: string;
  topicDiscussed: string;
  conductedBy: string;
  conductorSignature: string;
  trainees: TraineeRow[];
  images: Array<{ serverUrl: string; status: 'success' | 'failed' | 'pending'; }>;
  created_at?: string;
}

const requireFirestore = () => {
  const db = getFirebaseFirestore();
  if (!db) {
    throw new Error('CONFIGURATION FAULT: Firebase database is not configured. Verify Firebase credentials.');
  }
  return db;
};

export const getTrainingHistory = async (): Promise<TrainingSessionData[]> => {
  const db = getFirebaseFirestore();
  if (!db) return [];

  const snapshot = await getDocs(query(
    collection(db, 'trainingSessions'),
    orderBy('created_at', 'desc')
  ));
  return snapshot.docs.map(record => {
    const data = record.data();
    return {
      id: record.id,
      projectName: String(data.projectName || ''),
      locationText: String(data.locationText || ''),
      contractor: String(data.contractor || ''),
      topicDiscussed: String(data.topicDiscussed || ''),
      conductedBy: String(data.conductedBy || ''),
      conductorSignature: String(data.conductorSignature || ''),
      created_at: typeof data.created_at === 'string' ? data.created_at : undefined,
      trainees: Array.isArray(data.trainees) ? data.trainees as TraineeRow[] : [],
      images: Array.isArray(data.images) ? data.images as TrainingSessionData['images'] : []
    };
  });
};

export const saveTrainingRoster = async (data: TrainingSessionData): Promise<string> => {
  const db = requireFirestore();
  const createdAt = data.created_at || new Date().toISOString();
  const record = await addDoc(collection(db, 'trainingSessions'), {
    projectName: data.projectName,
    locationText: data.locationText,
    gpsCoordinates: data.gpsCoordinates || '',
    contractor: data.contractor,
    topicDiscussed: data.topicDiscussed,
    conductedBy: data.conductedBy,
    conductorSignature: data.conductorSignature,
    trainees: data.trainees,
    images: data.images,
    created_at: createdAt,
    created_at_timestamp: Timestamp.fromDate(new Date(createdAt))
  });
  return record.id;
};
