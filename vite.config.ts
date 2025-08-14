import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";
import { traeBadgePlugin } from 'vite-plugin-trae-solo-badge';
import electron from 'vite-plugin-electron';
import { notBundle } from 'vite-plugin-electron/plugin';
import pkg from './package.json';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          'react-dev-locator',
        ],
      },
    }),
    traeBadgePlugin({
      variant: 'dark',
      position: 'bottom-right',
      prodOnly: true,
      clickable: true,
      clickUrl: 'https://www.trae.ai/solo?showJoin=1',
      autoTheme: true,
      autoThemeTarget: '#root'
    }), 
    tsconfigPaths(),
    electron([
      {
        // Main-Process entry file of the Electron App.
        entry: 'electron/main.ts',
        onstart(args) {
          if (process.env.VSCODE_DEBUG) {
            console.log(/* For `.vscode/.debug.script.mjs` */'[startup] Electron App');
          } else {
            args.startup();
          }
        },
        vite: {
          build: {
            sourcemap: false,
            minify: process.env.NODE_ENV === 'production',
            outDir: 'dist-electron/main',
            rollupOptions: {
              external: Object.keys('dependencies' in pkg ? pkg.dependencies : {}),
            },
          },
          plugins: [notBundle()],
        },
      },
      {
        entry: 'electron/preload/index.ts',
        onstart(args) {
          // Notify the Renderer-Process to reload the page when the Preload-Scripts build is complete, 
          // instead of restarting the entire Electron App.
          args.reload();
        },
        vite: {
          build: {
            sourcemap: 'inline',
            minify: process.env.NODE_ENV === 'production',
            outDir: 'dist-electron/preload',
            rollupOptions: {
              external: Object.keys('dependencies' in pkg ? pkg.dependencies : {}),
            },
          },
          plugins: [notBundle()],
        },
      },
    ]),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      }
    }
  }
})
