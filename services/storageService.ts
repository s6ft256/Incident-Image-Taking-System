import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from '../constants';

// Initialize Supabase Client
// We check if keys are dummy values to prevent crash, though upload will fail if not set.
const isValidConfig = SUPABASE_CONFIG.URL.startsWith('https') && !SUPABASE_CONFIG.URL.includes('your-project-id');

const supabase = isValidConfig 
  ? createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.ANON_KEY)
  : null;

/**
 * Uploads a file to Supabase Storage and returns the Public URL.
 * @param file The file object to upload
 * @param folder The folder path within the bucket (default: 'uploads')
 */
export const uploadImageToStorage = async (file: File, folder: string = 'uploads'): Promise<string> => {
  if (!supabase) {
    throw new Error("Supabase is not configured. Please set URL and KEY in constants.ts");
  }

  // 1. Create a unique file path: folder/timestamp_random_filename
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
  
  // Ensure clean folder path
  const cleanFolder = folder.replace(/^\/+|\/+$/g, '');
  const filePath = `${cleanFolder}/${fileName}`;

  // 2. Upload the file
  const { data, error } = await supabase.storage
    .from(SUPABASE_CONFIG.BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    console.error("Supabase Upload Error:", error);
    
    // Check for specific RLS error to give a better hint
    if (error.message.includes('row-level security') || error.message.includes('policy')) {
      throw new Error(`Permission denied: You need to add an INSERT policy for the '${SUPABASE_CONFIG.BUCKET_NAME}' bucket in Supabase.`);
    }

    throw new Error(`Upload failed: ${error.message}`);
  }

  // 3. Get Public URL
  const { data: { publicUrl } } = supabase.storage
    .from(SUPABASE_CONFIG.BUCKET_NAME)
    .getPublicUrl(filePath);

  return publicUrl;
};