
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Ensure process and process.env exist in the browser to prevent crashes
      'process.env': JSON.stringify({}),
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ""),
      'process.env.VITE_AIRTABLE_BASE_ID': JSON.stringify(env.VITE_AIRTABLE_BASE_ID || ""),
      'process.env.VITE_AIRTABLE_API_KEY': JSON.stringify(env.VITE_AIRTABLE_API_KEY || ""),
      'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || ""),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || ""),
      'process.env.VITE_SUPABASE_BUCKET': JSON.stringify(env.VITE_SUPABASE_BUCKET || ""),
      'process.env.VITE_ARCHIVE_ACCESS_KEY': JSON.stringify(env.VITE_ARCHIVE_ACCESS_KEY || ""),
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'recharts'],
          },
        },
      },
    },
  };
});
