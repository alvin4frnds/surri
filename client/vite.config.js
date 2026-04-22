import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    vue(),
    VitePWA({
      // 'prompt' fires onNeedRefresh but doesn't auto-activate. UI is gated
      // behind VITE_SHOW_UPDATE_BANNER; when the flag is off, new SW waits
      // for natural page reload before activating.
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: [
        'icon.png',
        'icon-512.png',
        'privacy-policy.html',
      ],
      manifest: {
        name: 'Surri',
        short_name: 'Surri',
        description: 'Multiplayer card game — Spades variant',
        theme_color: '#1e293b',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icon.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // Precache only the app shell. Cards (67 PNGs, ~5 MB) are handled
        // by runtime CacheFirst below — first-visit network, offline after
        // first use. Cuts precache from ~5.3 MB to under 500 KB.
        globPatterns: ['**/*.{js,css,html,svg,woff,woff2}', 'icon*.png'],
        globIgnores: ['**/cards/**'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [
          /^\/socket\.io\//,
          /^\/api\//,
          /^\/dashboard/,
          /^\/privacy-policy\.html$/,
        ],
        runtimeCaching: [
          {
            // Card PNGs — CacheFirst so each one is saved after first use.
            // After one full game all 67 are in cache.
            urlPattern: /^\/cards\/.*\.png$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cards',
              expiration: { maxEntries: 70, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^\/socket\.io\/.*/,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^\/api\/.*/,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^\/dashboard.*/,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/www\.googletagmanager\.com\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'gtag-runtime',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
          {
            urlPattern: /^https:\/\/(firebase|firebaseinstallations|firebaselogging|firebaseapp)\.googleapis\.com\/.*/,
            handler: 'NetworkOnly',
          },
        ],
      },
      devOptions: {
        // HMR and SW conflict in dev — only run SW on `npm run build` + preview / prod.
        enabled: false,
      },
    }),
  ],
  server: {
    proxy: {
      '/dashboard': 'http://localhost:3000',
      '/api': 'http://localhost:3000',
    },
  },
})
