import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        // Walk-up/pregame clips can run several MB — well past Workbox's
        // 2MB default precache ceiling — so every roster audio file is
        // still picked up on first visit.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,mp3,wav,m4a,woff,woff2,ttf}'],
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
      },
      manifest: {
        name: 'Lugnuts Soundboard',
        short_name: 'Lugnuts SB',
        description: 'Redding Lugnuts game-day soundboard — pregame, walk-up, and FX cues.',
        start_url: '/',
        display: 'standalone',
        background_color: '#0D0D0D',
        theme_color: '#0D0D0D',
        icons: [
          { src: '/icons/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: '/icons/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
})
