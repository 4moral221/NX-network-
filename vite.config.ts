import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  
  // Build-time env validation
  const requiredEnvs = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
  if (process.env.NODE_ENV === 'production' || mode === 'production') {
    requiredEnvs.forEach((key) => {
      if (!env[key]) {
        console.warn(`[WARNING] Missing build-time environment variable: ${key}. This may cause runtime errors.`);
      }
    });
  }
  
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
        workbox: {
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          navigateFallbackDenylist: [/^\/api/]
        },
        manifest: {
          name: 'NX Network',
          short_name: 'NX',
          description: 'Loyalty for Every Duka',
          theme_color: '#0a0a0a',
          background_color: '#0a0a0a',
          display: 'standalone',
          start_url: '/app/',
          scope: '/app/',
          icons: [
            {
              src: '/icon.svg',
              sizes: '192x192',
              type: 'image/svg+xml'
            },
            {
              src: '/icon.svg',
              sizes: '512x512',
              type: 'image/svg+xml'
            }
          ]
        }
      })
    ],
    define: {
      'import.meta.env.VITE_APP_TARGET': JSON.stringify(env.VITE_APP_TARGET || (['landing', 'pwa', 'admin', 'merchant', 'fmcg'].includes(mode) ? mode : undefined)),
      'process.env.GOOGLE_MAPS_PLATFORM_KEY': JSON.stringify(process.env.GOOGLE_MAPS_PLATFORM_KEY || env.GOOGLE_MAPS_PLATFORM_KEY || '')
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: false,
    },
  };
});
