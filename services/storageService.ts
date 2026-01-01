import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from '../constants';

const isValidConfig = SUPABASE_CONFIG.URL.startsWith('https') && !SUPABASE_CONFIG.URL.includes('your-project-id');

const supabase = isValidConfig 
  ? createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.ANON_KEY)
  : null;

/**
 * Maps technical storage errors to human-readable safety messages.
 */
const getFriendlyStorageError = (error: any, bucketName: string): string => {
  const message = error?.message || '';
  if (message.includes('row-level security') || message.includes('policy')) {
    return "Storage access denied. Please contact the safety administrator to verify storage bucket permissions.";
  }
  if (message.includes('bucket not found')) {
    return `The '${bucketName}' storage container does not exist. Please check system configuration.`;
  }
  if (message.includes('Network request failed') || message.includes('fetch')) {
    return "Network instability detected. We are attempting to reconnect to the secure evidence server.";
  }
  return "An unexpected error occurred while saving the evidence. Our system will attempt to retry.";
};

/**
 * Uploads a file to Supabase Storage with automatic retry logic.
 * @param bucketName Optional override for the bucket. Defaults to SUPABASE_CONFIG.BUCKET_NAME.
 */
export const uploadImageToStorage = async (
  file: File, 
  folder: string = 'uploads', 
  maxRetries = 3,
  bucketName?: string
): Promise<string> => {
  if (!supabase) {
    throw new Error("Safety storage is not configured. Please provide a valid Supabase URL and Key.");
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
        // Don't retry client errors that won't change (auth/permission/not found)
        const isClientError = error.message.includes('security') || 
                            error.message.includes('policy') || 
                            error.message.includes('not found');
        
        if (isClientError || attempt === maxRetries) {
          throw new Error(getFriendlyStorageError(error, bucketToUse));
        }
        
        // Wait before next attempt (exponential backoff)
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