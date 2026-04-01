import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import compression from 'vite-plugin-compression'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Gzip & Brotli compression for production chunks
    compression({ algorithm: 'brotliCompress', ext: '.br', threshold: 1024 }),
    compression({ algorithm: 'gzip', ext: '.gz', threshold: 1024 }),
    // Bundle visualizer (generates stats.html during build)
    visualizer({ open: false, filename: 'bundle-stats.html', gzipSize: true, brotliSize: true }),
  ],
  build: {
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Core react vendor
            if (id.includes('react-dom') || id.includes('react/') || id.includes('scheduler')) return 'vendor-react';
            if (id.includes('react-router')) return 'vendor-router';
            
            // Heavy Data Visualization (Splitting Recharts specifically)
            if (id.includes('recharts')) return 'vendor-charts';
            if (id.includes('d3-')) return 'vendor-d3';
            
            // Document Generation libs (Splitting heavy ones)
            if (id.includes('pdfmake')) return 'vendor-pdfmake'; 
            if (id.includes('jspdf')) return 'vendor-jspdf';
            if (id.includes('html2canvas') || id.includes('html-to-image')) return 'vendor-html-utils';
            if (id.includes('docxtemplater') || id.includes('pizzip')) return 'vendor-docx';

            // UI Libraries
            if (id.includes('sweetalert2')) return 'vendor-swal';
            if (id.includes('react-toastify')) return 'vendor-toast';

            // Icons (Lucide is tree-shakeable but can be large)
            if (id.includes('lucide-react')) return 'vendor-icons';
          }
        },
      },
    },
    // Performance-focused minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 3, // Extra passes for deeper optimization
        pure_funcs: ['console.info', 'console.debug'], // Remove specific ones if needed
      },
      mangle: {
        toplevel: true,
      },
      format: {
        comments: false,
      },
    },
    // Standard ES2020 target for modern browser features and smaller code
    target: 'es2020',
    cssCodeSplit: true,
    cssMinify: true,
    sourcemap: false,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'recharts', 'lucide-react'],
  },
})
