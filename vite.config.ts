
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // تحميل المتغيرات البيئية بناءً على الوضع (development/production)
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // ضمان توفر API_KEY في كلا الحالتين
      'process.env.API_KEY': JSON.stringify(env.VITE_API_KEY || env.API_KEY),
      'import.meta.env.VITE_API_KEY': JSON.stringify(env.VITE_API_KEY || env.API_KEY)
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor': ['react', 'react-dom', 'react-markdown'],
            'genai': ['@google/generative-ai']
          }
        }
      }
    },
    server: {
      port: 3000,
      host: true
    }
  };
});
