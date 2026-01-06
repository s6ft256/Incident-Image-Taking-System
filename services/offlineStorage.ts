import { ObservationForm, UploadedImage, IncidentForm, OfflineIncident } from '../types';

const DB_NAME = 'HSE_Guardian_Offline_DB';
const OBS_STORE_NAME = 'pending_observation_reports';
const INCIDENT_STORE_NAME = 'pending_incident_reports';
const DB_VERSION = 3;

export interface OfflineObservation {
  id: string;
  form: ObservationForm;
  images: {
    id: string;
    file: File;
  }[];
  timestamp: number;
}

/**
 * Validates if the current environment supports the persistence protocol.
 */
export const isPersistenceSupported = (): boolean => {
  return 'indexedDB' in window;
};

/**
 * Initializes a secure connection to the local safety database.
 */
export const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (!isPersistenceSupported()) {
      reject(new Error("IndexedDB is not supported on this terminal."));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(OBS_STORE_NAME)) {
        db.createObjectStore(OBS_STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(INCIDENT_STORE_NAME)) {
        db.createObjectStore(INCIDENT_STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("Local Database Access Denied. Check storage permissions."));
  });
};

/**
 * Commits a report and its associated binary evidence to local storage.
 */
export const saveOfflineReport = async (form: ObservationForm, images: UploadedImage[]): Promise<void> => {
  const db = await openDB();
  const offlineData: OfflineObservation = {
    id: crypto.randomUUID(),
    form,
    images: images.map(img => ({ id: img.id, file: img.file })),
    timestamp: Date.now()
  };

  return new Promise<void>((resolve, reject) => {
    try {
      const tx = db.transaction(OBS_STORE_NAME, 'readwrite');
      const store = tx.objectStore(OBS_STORE_NAME);
      store.put(offlineData);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error("Failed to write to local ledger."));
    } catch (e) {
      reject(e);
    }
  });
};

export const saveOfflineIncident = async (form: IncidentForm, images: UploadedImage[]): Promise<void> => {
  const db = await openDB();
  const offlineData: OfflineIncident = {
    id: crypto.randomUUID(),
    form,
    images: images.map(img => ({ id: img.id, file: img.file, isAnnotated: img.isAnnotated })),
    timestamp: Date.now()
  };
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(INCIDENT_STORE_NAME, 'readwrite');
    tx.objectStore(INCIDENT_STORE_NAME).put(offlineData);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(new Error("Failed to persist incident to local ledger."));
  });
};


/**
 * Retrieves all reports currently queued in the local database.
 */
export const getOfflineReports = async (): Promise<OfflineObservation[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OBS_STORE_NAME, 'readonly');
    const request = tx.objectStore(OBS_STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(new Error("Failed to extract data from local ledger."));
  });
};

export const getOfflineIncidents = async (): Promise<OfflineIncident[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(INCIDENT_STORE_NAME, 'readonly');
    const request = tx.objectStore(INCIDENT_STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(new Error("Failed to extract incidents from local ledger."));
  });
};

/**
 * Returns the total number of reports awaiting synchronization.
 */
export const getPendingReportCount = async (): Promise<number> => {
  const db = await openDB();
  const tx = db.transaction([OBS_STORE_NAME, INCIDENT_STORE_NAME], 'readonly');
  const obsCountReq = tx.objectStore(OBS_STORE_NAME).count();
  const incCountReq = tx.objectStore(INCIDENT_STORE_NAME).count();
  
  return new Promise((resolve) => {
    let obsCount = 0;
    let incCount = 0;
    obsCountReq.onsuccess = () => { obsCount = obsCountReq.result; };
    incCountReq.onsuccess = () => { incCount = incCountReq.result; };
    tx.oncomplete = () => resolve(obsCount + incCount);
  });
};

/**
 * Deletes a specific report from the local queue upon successful cloud synchronization.
 */
export const deleteOfflineReport = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(OBS_STORE_NAME, 'readwrite');
    tx.objectStore(OBS_STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(new Error("Failed to purge report from local storage."));
  });
};

export const deleteOfflineIncident = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(INCIDENT_STORE_NAME, 'readwrite');
    tx.objectStore(INCIDENT_STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(new Error("Failed to purge incident from local storage."));
  });
};


/**
 * Completely purges the local report database. Use with caution.
 */
export const clearOfflineStorage = async (): Promise<void> => {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction([OBS_STORE_NAME, INCIDENT_STORE_NAME], 'readwrite');
    tx.objectStore(OBS_STORE_NAME).clear();
    tx.objectStore(INCIDENT_STORE_NAME).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(new Error("Global purge operation interrupted."));
  });
};