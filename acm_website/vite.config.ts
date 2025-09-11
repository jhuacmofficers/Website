import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // Increase or silence chunk size warnings
    chunkSizeWarningLimit: 2000,
  },
  // Only show errors, not warnings
  logLevel: 'error',
})
