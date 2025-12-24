import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync } from 'fs'
import { join } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-redirects',
      closeBundle() {
        // Ensure _redirects file is copied to dist
        try {
          copyFileSync(
            join(__dirname, 'public', '_redirects'),
            join(__dirname, 'dist', '_redirects')
          );
        } catch (err) {
          console.warn('Could not copy _redirects file:', err);
        }
      },
    },
  ],
})
