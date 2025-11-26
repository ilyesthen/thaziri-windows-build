import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'
import { resolve } from 'path'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  root: 'src/renderer',
  plugins: [
    react(),
    electron({
      main: {
        entry: path.resolve(__dirname, 'src/main/index.ts'),
        vite: {
          build: {
            outDir: path.resolve(__dirname, 'dist-electron'),
            rollupOptions: {
              output: {
                entryFileNames: 'main.js'
              },
              external: ['@prisma/client', '.prisma/client']
            }
          }
        }
      },
      preload: {
        input: path.resolve(__dirname, 'src/preload/index.ts'),
        vite: {
          build: {
            outDir: path.resolve(__dirname, 'dist-electron'),
            rollupOptions: {
              output: {
                entryFileNames: 'preload.js'
              }
            }
          }
        }
      },
      renderer: {},
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@main': resolve(__dirname, 'src/main'),
      '@renderer': resolve(__dirname, 'src/renderer'),
      '@preload': resolve(__dirname, 'src/preload'),
    },
  },
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
  server: {
    port: process.env.VITE_PORT ? parseInt(process.env.VITE_PORT) : 5173,
    strictPort: false, // Allow automatic port selection if port is busy
  },
})