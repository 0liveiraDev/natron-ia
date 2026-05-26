import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    server: {
        port: 3000,
    },
    esbuild: {
        drop: ['console', 'debugger'],
    },
    build: {
        sourcemap: false,
        target: 'es2020',
        cssMinify: 'esbuild',
        minify: 'esbuild',
        chunkSizeWarningLimit: 600,
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom', 'react-router-dom'],
                    charts: ['recharts'],
                    animations: ['framer-motion'],
                    icons: ['lucide-react']
                }
            }
        }
    }
})
