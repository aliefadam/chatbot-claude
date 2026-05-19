import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: './', // Important for Electron
  build: {
    outDir: 'dist-react',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: undefined, // Disable code splitting for Electron
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src-react'),
    },
  },
})
