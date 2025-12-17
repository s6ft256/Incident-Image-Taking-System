import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Polyfill process.env.API_KEY for the Google GenAI SDK
      // Checks for API_KEY, VITE_API_KEY, or VITE_GOOGLE_API_KEY to ensure Vercel deployment works
      // regardless of how the user names the variable in the dashboard.
      // Defaults to '' to prevent "process is not defined" error in browser.
      'process.env.API_KEY': JSON.stringify(env.API_KEY || env.VITE_API_KEY || env.VITE_GOOGLE_API_KEY || ''),
    }
  };
});