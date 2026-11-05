// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite'

import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  vite: {
    plugins: [
      tailwindcss(),
    ],
    server: {
      allowedHosts: true,
    }
  },
  future: {
    compatibilityVersion: 4,
  },
  components: [
    { path: '~/components', pathPrefix: false },
    { path: '~/ui/components', pathPrefix: false },
  ],
  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
    head: {
      title: 'GymOS — Gym AGOD',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#0D0D0D' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico?v=2' },
        { rel: 'apple-touch-icon', href: '/img/logo-agod.png' },
        { rel: 'manifest', href: '/manifest.json' },
      ],
    },
  },
  devServer: {
    port: 3000,
    host: '0.0.0.0'
  },
  ssr: false
})

