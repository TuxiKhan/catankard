import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || './',
  resolve: {
    alias: {
      '@catankard/engine': path.resolve(__dirname, '../../packages/engine/src/index.ts'),
    },
  },
});
