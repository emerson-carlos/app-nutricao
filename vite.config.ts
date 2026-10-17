import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// O app é publicado no GitHub Pages em /app-nutricao/.
export default defineConfig({
  base: '/app-nutricao/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Nutrição',
        short_name: 'Nutrição',
        description: 'Metas, água e registro de refeições.',
        lang: 'pt-BR',
        start_url: '.',
        display: 'standalone',
        background_color: '#f4f5ef',
        theme_color: '#2f6b47',
        icons: [
          { src: 'icone-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icone-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icone-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2}'] },
    }),
  ],
})
