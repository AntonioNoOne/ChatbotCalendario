import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');

    return {
        server: {
            port: 3000,
            host: '0.0.0.0',
            // <‑‑ aggiungi qui l'host di Render (e localhost per lo sviluppo)
            allowedHosts: ['chatbotcalendario.onrender.com', 'localhost'],
        },
        plugins: [react()],
        define: {
            // Configurazione per le variabili d'ambiente
            'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY),
        },
        resolve: {
            alias: {
                '@': path.resolve(__dirname, '.'),
            },
        },
        build: {
            outDir: 'dist',
            sourcemap: false,
            minify: 'terser',
            rollupOptions: {
                output: {
                    manualChunks: {
                        vendor: ['react', 'react-dom'],
                        gemini: ['@google/genai']
                    }
                }
            }
        }
    };
});