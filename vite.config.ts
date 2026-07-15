import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { port: 5190 },
  build: { chunkSizeWarningLimit: 900 },
});
