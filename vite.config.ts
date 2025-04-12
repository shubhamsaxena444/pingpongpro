import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    define: {
      // Make all env variables available to the app by exposing them on import.meta.env
      'import.meta.env.VITE_COSMOS_DB_CONNECTION_STRING': JSON.stringify(env.VITE_COSMOS_DB_CONNECTION_STRING || ''),
      'import.meta.env.VITE_COSMOS_DB_DATABASE_NAME': JSON.stringify(env.VITE_COSMOS_DB_DATABASE_NAME || ''),
      'import.meta.env.VITE_COSMOS_DB_CONTAINER_NAME': JSON.stringify(env.VITE_COSMOS_DB_CONTAINER_NAME || ''),
      'import.meta.env.VITE_MICROSOFT_CLIENT_ID': JSON.stringify(env.VITE_MICROSOFT_CLIENT_ID || ''),
      'import.meta.env.VITE_MICROSOFT_CLIENT_SECRET': JSON.stringify(env.VITE_MICROSOFT_CLIENT_SECRET || ''),
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || ''),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || ''),
      'import.meta.env.VITE_AZURE_OPENAI_API_KEY': JSON.stringify(env.VITE_AZURE_OPENAI_API_KEY || ''),
      'import.meta.env.VITE_AZURE_OPENAI_ENDPOINT': JSON.stringify(env.VITE_AZURE_OPENAI_ENDPOINT || ''),
      'import.meta.env.VITE_AZURE_OPENAI_MODEL_NAME': JSON.stringify(env.VITE_AZURE_OPENAI_MODEL_NAME || ''),
      'import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT_NAME': JSON.stringify(env.VITE_AZURE_OPENAI_DEPLOYMENT_NAME || ''),
      'import.meta.env.VITE_AZURE_OPENAI_API_VERSION': JSON.stringify(env.VITE_AZURE_OPENAI_API_VERSION || '2023-05-15'),
    },
    server: {
      host: true, // This binds to all available network interfaces (0.0.0.0)
      port: 5173,
      strictPort: true, // Fail if port is already in use instead of trying another
      cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
      },
      proxy: {
        // Proxy requests to Cosmos DB through your development server
        '/cosmos-api': {
          target: 'https://pingpongpro.documents.azure.com/',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/cosmos-api/, ''),
          secure: true,
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('proxy error', err);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('Sending Request to the Target:', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
            });
          },
        }
      },
      hmr: {
        clientPort: 5173 // Ensure HMR works correctly through potential proxies
      },
      watch: {
        usePolling: true, // This helps with some file system watchers that might otherwise miss changes
      },
    }
  };
});
