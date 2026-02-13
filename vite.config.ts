
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    resolve: {
      alias: {
        // Polyfill buffer for simple-peer
        buffer: 'buffer',
      },
    },
    define: {
      // Define process.env for the GemAI SDK and simple-peer
      'process.env': {
        API_KEY: env.API_KEY,
        NODE_ENV: JSON.stringify(mode),
      },
      // Polyfill global for simple-peer
      global: 'window',
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
    server: {
      port: 3000,
    }
  };
});
