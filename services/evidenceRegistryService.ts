import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getFirebaseFirestore } from './firebaseService';
import { uploadImageToStorage } from './storageService';

const EVIDENCE_COLLECTION = 'evidence_images';

export interface EvidenceRegistryEntry {
  recordId?: string;
  tableName: string;
  fieldName: string;
  filename: string;
  url: string;
  reason: string;
}

/**
 * Secondary evidence pipeline.
 *
 * Used when a direct Airtable attachment upload is not possible. The binary is
 * persisted to Firebase Storage to obtain a durable URL, and a registry record
 * is written to Firestore so the fallback is auditable. The returned URL is then
 * synced back to the Airtable attachment field by the caller.
 */
export const persistEvidenceFallback = async (
  file: File,
  context: { tableName: string; fieldName: string; recordId?: string; reason?: string }
): Promise<{ url: string; filename: string }> => {
  const url = await uploadImageToStorage(file, 'incident_evidence');
  const filename = file.name;

  // Best-effort Firestore registry entry; never block evidence sync on it.
  try {
    const db = getFirebaseFirestore();
    if (db) {
      const entry: EvidenceRegistryEntry = {
        recordId: context.recordId,
        tableName: context.tableName,
        fieldName: context.fieldName,
        filename,
        url,
        reason: context.reason || 'airtable-direct-upload-failed',
      };
      await addDoc(collection(db, EVIDENCE_COLLECTION), {
        ...entry,
        created_at: serverTimestamp(),
      });
    }
  } catch (error) {
    console.warn('Evidence registry write failed (non-fatal):', error);
  }

  return { url, filename };
};
