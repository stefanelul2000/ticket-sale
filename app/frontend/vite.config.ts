import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Build directly into the Laravel public folder to avoid manual copy.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../backend/public',
    emptyOutDir: false, // don't wipe other public assets
  },
});
