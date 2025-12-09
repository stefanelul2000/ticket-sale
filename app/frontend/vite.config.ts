import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Build directly into the Laravel public folder to avoid manual copy.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../backend/public',
    // Avoid wiping user-uploaded public assets during local builds; container builds copy a clean public anyway.
    emptyOutDir: false,
  },
});
