
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // FIX: Replaced `process.cwd()` with `'.'` to avoid dependency on Node.js types.
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react()],
    define: {
      // Vite performs direct string replacement. Values must be stringified.
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      // @google/genai-fix: Added environment variables to the define block to make them accessible via process.env in constants.ts.
      'process.env.VITE_AIRTABLE_BASE_ID': JSON.stringify(env.VITE_AIRTABLE_BASE_ID),
      'process.env.VITE_AIRTABLE_API_KEY': JSON.stringify(env.VITE_AIRTABLE_API_KEY),
      'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
      'process.env.VITE_SUPABASE_BUCKET': JSON.stringify(env.VITE_SUPABASE_BUCKET),
    }
  };
});
