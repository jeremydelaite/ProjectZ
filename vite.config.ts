// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    {
      name: 'full-reload',
      handleHotUpdate({ server }) {
        server.hot.send({ type: 'full-reload' });
        return [];
      },
    },
  ],
  server: {
    port: 3000,
    open: false,
  },
  build: {
    target: 'esnext',
    minify: 'oxc',
    outDir: 'dist',
  },
});