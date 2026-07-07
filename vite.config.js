import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: {
    port: 5173,
    strictPort: true,
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Preço Certo',
        short_name: 'PreçoCerto',
        description: 'Lista de compras com leitura de NFC-e do ES',
        theme_color: '#1a4a7a',
        background_color: '#faf7f2',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/logo.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/logo.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
})
