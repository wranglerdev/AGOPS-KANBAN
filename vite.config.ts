import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  root: 'src/renderer',
  publicDir: 'public',
  resolve: {
    alias: {
      '@renderer': resolve('src/renderer/src')
    }
  },
  build: {
    outDir: resolve('dist'),
    emptyOutDir: true
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false, // registramos manualmente em main.tsx p/ respeitar a CSP (sem inline script)
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'AGOPS Kanban',
        short_name: 'AGOPS',
        description: 'App corporativo de gestão de tarefas',
        lang: 'pt-BR',
        theme_color: '#f4f6fb',
        background_color: '#f4f6fb',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        clientsClaim: true,
        skipWaiting: true
      },
      devOptions: {
        enabled: true
      }
    })
  ]
})
