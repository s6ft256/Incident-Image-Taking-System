import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { getFirebaseStorage } from './firebaseService';

/**
 * Maps technical storage errors to high-integrity safety messages.
 */
const getFriendlyStorageError = (error: unknown): string => {
  const code =
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
      ? error.code
      : '';

  if (code === 'storage/unauthorized' || code === 'storage/unauthenticated') {
    return "VAULT ACCESS DENIED: Digital evidence container is locked. Contact HSE Administrator to verify terminal permissions.";
  }
  if (code === 'storage/bucket-not-found') {
    return 'REPOSITORY ERROR: The designated Firebase Storage bucket could not be located.';
  }
  if (code === 'storage/quota-exceeded') {
    return 'STORAGE CAPACITY REACHED: Firebase Storage quota has been exceeded.';
  }
  if (
    code === 'storage/retry-limit-exceeded' ||
    code === 'storage/network-request-failed'
  ) {
    return "SYNC DISRUPTED: Site network instability detected. Attempting to re-establish secure evidence link...";
  }
  return "SYSTEM FAULT: An unexpected error occurred while archiving evidence. Protocol will attempt a retry.";
};

/**
 * Uploads a file to Firebase Storage with automatic retry logic.
 */
export const uploadImageToStorage = async (
  file: File, 
  folder: string = 'uploads', 
  maxRetries = 3,
  bucketName?: string
): Promise<string> => {
  const storage = getFirebaseStorage(bucketName);
  if (!storage) {
    throw new Error("CONFIGURATION FAULT: Evidence storage grid is not activated. Verify Firebase credentials.");
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
  const cleanFolder = folder.replace(/^\/+|\/+$/g, '');
  const storageRef = ref(storage, `${cleanFolder}/${fileName}`);

  let lastError: unknown;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await uploadBytes(storageRef, file, {
        cacheControl: 'public,max-age=3600',
      });
      return await getDownloadURL(storageRef);
    } catch (error: unknown) {
      lastError = error;
      const code =
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        typeof error.code === 'string'
          ? error.code
          : '';
      const isFatalError = [
        'storage/unauthorized',
        'storage/unauthenticated',
        'storage/bucket-not-found',
        'storage/quota-exceeded',
        'storage/invalid-checksum',
        'storage/invalid-format',
        'storage/invalid-argument',
      ].includes(code);

      if (isFatalError || attempt === maxRetries) {
        throw new Error(getFriendlyStorageError(error), { cause: error });
      }

      await new Promise(res => setTimeout(res, Math.pow(2, attempt) * 1000));
    }
  }

  throw lastError ?? new Error('Firebase Storage upload failed without an error result.');
};