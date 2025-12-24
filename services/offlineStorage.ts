
// Fix: Use correct exported member 'ObservationForm' instead of 'IncidentForm'
import { ObservationForm, UploadedImage } from '../types';

const DB_NAME = 'IncidentReporterDB';
const STORE_NAME = 'pendingReports';
const DB_VERSION = 1;

interface OfflineReport {
  id: string;
  form: ObservationForm;
  images: {
    id: string;
    file: File;
  }[];
  timestamp: number;
}

export const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Fix: Use correct exported member 'ObservationForm' instead of 'IncidentForm'
export const saveOfflineReport = async (form: ObservationForm, images: UploadedImage[]) => {
  const db = await openDB();
  const offlineData: OfflineReport = {
    id: crypto.randomUUID(),
    form,
    images: images.map(img => ({ id: img.id, file: img.file })),
    timestamp: Date.now()
  };

  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(offlineData);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getOfflineReports = async (): Promise<OfflineReport[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const deleteOfflineReport = async (id: string) => {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};
