
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Polyfill process.env.API_KEY for the Google GenAI SDK
      // Prioritizes AI_GATEWAY_API_KEY as requested for Vercel support
      'process.env.API_KEY': JSON.stringify(
        process.env.AI_GATEWAY_API_KEY || 
        env.AI_GATEWAY_API_KEY ||
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
