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
      // Robustly checks various env var names:
      // 1. process.env.API_KEY (System env var during build)
      // 2. env.API_KEY (Loaded via loadEnv)
      // 3. VITE_ prefixed versions
      'process.env.API_KEY': JSON.stringify(
        process.env.API_KEY || 
        process.env.VITE_API_KEY || 
        process.env.VITE_GOOGLE_API_KEY || 
        env.API_KEY || 
        env.VITE_API_KEY || 
        env.VITE_GOOGLE_API_KEY || 
        ''
      ),
    }
  };
});