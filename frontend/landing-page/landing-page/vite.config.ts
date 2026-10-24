import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Standalone Vite configuration for ANVITRACE Landing Page
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
  },
})
