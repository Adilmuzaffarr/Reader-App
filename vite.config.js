import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  build: { target: 'es2022', chunkSizeWarningLimit: 1500 },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,svg,png,mjs}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      },
      manifest: {
        name: 'Urdu Reader — اردو ریڈر',
        short_name: 'اردو ریڈر',
        description: 'Read EPUB and PDF books in Urdu, offline.',
        lang: 'ur',
        dir: 'rtl',
        display: 'standalone',
        background_color: '#faf7f2',
        theme_color: '#1f6f5c',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
        // Let the installed app be chosen when opening .epub / .pdf files
        file_handlers: [{
          action: './',
          accept: { 'application/epub+zip': ['.epub'], 'application/pdf': ['.pdf'] },
        }],
      },
    }),
  ],
});
