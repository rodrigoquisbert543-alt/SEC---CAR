import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo-seccar.png', 'logo-seccar-icon.png'],
      manifest: {
        name: 'SEC-CAR — Sistema de control financiero',
        short_name: 'SEC-CAR',
        description: 'Seminario de Educación Cristiana Caranavi',
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#ffffff',
        theme_color: '#12472b',
        lang: 'es',
        icons: [
          {
            src: '/logo-seccar-icon.png',
            sizes: '457x512',
            type: 'image/png',
            purpose: 'any'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkOnly',
            method: 'POST',
            options: {
              backgroundSync: {
                name: 'supabase-post-queue',
                options: {
                  maxRetentionTime: 24 * 60
                }
              }
            }
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkOnly',
            method: 'PUT',
            options: {
              backgroundSync: {
                name: 'supabase-put-queue',
                options: {
                  maxRetentionTime: 24 * 60
                }
              }
            }
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkOnly',
            method: 'PATCH',
            options: {
              backgroundSync: {
                name: 'supabase-patch-queue',
                options: {
                  maxRetentionTime: 24 * 60
                }
              }
            }
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkOnly',
            method: 'DELETE',
            options: {
              backgroundSync: {
                name: 'supabase-delete-queue',
                options: {
                  maxRetentionTime: 24 * 60
                }
              }
            }
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            method: 'GET',
            options: {
              cacheName: 'supabase-reads',
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60
              }
            }
          }
        ]
      }
    })
  ]
})