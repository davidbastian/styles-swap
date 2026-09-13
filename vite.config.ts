import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/*
 * No define block, on purpose.
 *
 * The scaffold this started from baked GEMINI_API_KEY out of .env.local and
 * into the bundle at build time. Nothing reads it any more — the key is typed
 * into the app and kept in localStorage — and a build that inlines a key is a
 * key published to whoever loads the page. So the env is not read here at all.
 */
export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
