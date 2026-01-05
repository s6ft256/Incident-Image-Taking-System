import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from '../constants';

const isValidConfig = SUPABASE_CONFIG.URL && SUPABASE_CONFIG.URL.startsWith('https') && !SUPABASE_CONFIG.URL.includes('your-project-id');

const supabase = isValidConfig 
  ? createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.ANON_KEY)
  : null;

/**
 * Maps technical storage errors to high-integrity safety messages.
 */
const getFriendlyStorageError = (error: any, bucketName: string): string => {
  const message = error?.message || '';
  if (message.includes('row-level security') || message.includes('policy')) {
    return "VAULT ACCESS DENIED: Digital evidence container is locked. Contact HSE Administrator to verify terminal permissions.";
  }
  if (message.includes('bucket not found')) {
    return `REPOSITORY ERROR: The designated evidence vault '${bucketName}' could not be located in the safety grid.`;
  }
  if (message.includes('Payload too large')) {
    return "TRANSMISSION OVERLOAD: Evidence image exceeds the maximum safety-protocol file size. Try lower resolution.";
  }
  if (message.includes('Network request failed') || message.includes('fetch')) {
    return "SYNC DISRUPTED: Site network instability detected. Attempting to re-establish secure evidence link...";
  }
  return "SYSTEM FAULT: An unexpected error occurred while archiving evidence. Protocol will attempt a retry.";
};

/**
 * Uploads a file to Supabase Storage with automatic retry logic.
 */
export const uploadImageToStorage = async (
  file: File, 
  folder: string = 'uploads', 
  maxRetries = 3,
  bucketName?: string
): Promise<string> => {
  if (!supabase) {
    throw new Error("CONFIGURATION FAULT: Evidence storage grid is not activated. Verify Supabase credentials.");
  }

  const bucketToUse = bucketName || SUPABASE_CONFIG.BUCKET_NAME;
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
  const cleanFolder = folder.replace(/^\/+|\/+$/g, '');
  const filePath = `${cleanFolder}/${fileName}`;

  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const { data, error } = await supabase.storage
        .from(bucketToUse)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        const isClientError = error.message.includes('security') || 
                            error.message.includes('policy') || 
                            error.message.includes('not found');
        
        if (isClientError || attempt === maxRetries) {
          throw new Error(getFriendlyStorageError(error, bucketToUse));
        }
        
        await new Promise(res => setTimeout(res, Math.pow(2, attempt) * 1000));
        continue;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(bucketToUse)
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      lastError = error;
      if (attempt === maxRetries) throw error;
      await new Promise(res => setTimeout(res, Math.pow(2, attempt) * 1000));
    }
  }

  throw lastError;
};