import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      // Service Worker wird automatisch generiert
      registerType: 'autoUpdate',

      // Web App Manifest: macht die App installierbar
      manifest: {
        name: 'UNO Multiplayer',
        short_name: 'UNO',
        description: 'Multiplayer UNO Kartenspiel',
        theme_color: '#2d0a6e',
        background_color: '#1a0a3c',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },

      // Cache-Strategie für Service Worker
      workbox: {
        // Diese Dateien werden gecacht (Offline-Strategie)
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],

        // Netzwerk zuerst für API-Anfragen (Spiel braucht immer Online)
        runtimeCaching: [
          {
            urlPattern: /^http:\/\/localhost:3000\/graphql/,
            handler: 'NetworkOnly', // Immer online, kein Cache für Spielzüge
          },
          {
            urlPattern: /^http:\/\/localhost:3000\/lobby/,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
})