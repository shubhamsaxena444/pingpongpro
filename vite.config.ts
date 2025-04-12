import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
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
  },
  // Make sure all environment variables are exposed to the client
  define: {
    'process.env': {}
  }
});
