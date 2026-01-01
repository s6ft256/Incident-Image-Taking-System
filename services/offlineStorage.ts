
import { ObservationForm, UploadedImage } from '../types';

const DB_NAME = 'HSE_Guardian_Offline_DB';
const STORE_NAME = 'pending_observation_reports';
const DB_VERSION = 2;

export interface OfflineReport {
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
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
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
  const offlineData: OfflineReport = {
    id: crypto.randomUUID(),
    form,
    images: images.map(img => ({ id: img.id, file: img.file })),
    timestamp: Date.now()
  };

  return new Promise<void>((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(offlineData);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error("Failed to write to local ledger."));
      request.onerror = () => reject(new Error("Data persistence failed."));
    } catch (e) {
      reject(e);
    }
  });
};

/**
 * Retrieves all reports currently queued in the local database.
 */
export const getOfflineReports = async (): Promise<OfflineReport[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new Error("Failed to extract data from local ledger."));
    } catch (e) {
      reject(e);
    }
  });
};

/**
 * Returns the total number of reports awaiting synchronization.
 */
export const getPendingReportCount = async (): Promise<number> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error("Failed to query queue status."));
    } catch (e) {
      reject(e);
    }
  });
};

/**
 * Deletes a specific report from the local queue upon successful cloud synchronization.
 */
export const deleteOfflineReport = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error("Failed to purge report from local storage."));
      request.onerror = () => reject(new Error("Purge operation failed."));
    } catch (e) {
      reject(e);
    }
  });
};

/**
 * Completely purges the local report database. Use with caution.
 */
export const clearOfflineStorage = async (): Promise<void> => {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.clear();

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error("Global purge operation interrupted."));
    } catch (e) {
      reject(e);
    }
  });
};
