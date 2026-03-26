import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'og-image.svg', 'icons/apple-touch-icon.png', 'offline.html'],
      manifest: {
        name: 'DIT PYQ Hub',
        short_name: 'PYQ Hub',
        description: 'DIT University Previous Year Question Papers',
        theme_color: '#070e1a',
        background_color: '#070e1a',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        lang: 'en',
        icons: [
          {
            src: 'icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/icon-512x512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      injectManifest: {
        // Precache all build assets
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Don't precache files larger than 2MB
        maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
      },
    })
  ],
})
