import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load environment variables based on the current mode
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    
    // Define additional environment variables if needed
    define: {
      // Make environment info available at build time
      __APP_ENV__: JSON.stringify(mode),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },
    
    // Server configuration for development
    server: {
      port: 3000,
      host: true, // Allow external connections
      cors: true,
      // Proxy API calls to backend during development if needed
      proxy: mode === 'development' ? {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        }
      } : undefined
    },
    
    // Build configuration
    build: {
      // Generate source maps for production debugging
      sourcemap: mode === 'production' ? 'hidden' : true,
      
      // Optimize build output
      rollupOptions: {
        output: {
          // Chunk splitting for better caching
          manualChunks: {
            vendor: ['react', 'react-dom'],
          }
        }
      }
    },
    
    // Environment variable configuration
    envPrefix: 'VITE_', // Only expose variables with VITE_ prefix to client
    
    // Preview server configuration (for production builds)
    preview: {
      port: 3000,
      host: true,
      cors: true,
    }
  }
})
