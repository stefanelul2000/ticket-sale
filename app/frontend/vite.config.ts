import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const buildTarget = process.env.BUILD_TO_BACKEND === 'true' ? '../backend/public' : 'dist';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: buildTarget,
    emptyOutDir: buildTarget === '../backend/public' ? false : true,
  },
});
