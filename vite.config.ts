import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    // Relative asset paths so the build works on GitHub Pages project sites,
    // custom domains and local previews without changes.
    base: './',
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Preview hostnames are injected per-process via env (comma-separated).
      // No hostname is hardcoded here; set PREVIEW_HOSTS when starting the server.
      allowedHosts: (process.env.PREVIEW_HOSTS || '')
        .split(',')
        .map((h) => h.trim())
        .filter(Boolean),
    },
  };
});
