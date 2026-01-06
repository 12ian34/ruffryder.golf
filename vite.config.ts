import { defineConfig, type UserConfig } from 'vite';
import react from '@vitejs/plugin-react';
import compression from 'vite-plugin-compression';

// Add type declarations for vite-plugin-compression
declare module 'vite-plugin-compression' {
  interface CompressionOptions {
    algorithm?: 'gzip' | 'brotliCompress' | 'deflate' | 'deflateRaw';
    ext?: string;
    threshold?: number;
    deleteOriginFile?: boolean;
    filter?: (file: string) => boolean;
  }
  export default function compression(options?: CompressionOptions): any;
}

export default defineConfig({
  plugins: [
    react(),
    compression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 10240, // Only compress files larger than 10KB
    }),
  ],
  server: {
    port: 5173,
    open: true,
    hmr: {
      overlay: true,
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
      format: {
        comments: false,
      },
    } as UserConfig['build'] extends { terserOptions?: infer T } ? T : never,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          editor: ['@tiptap/react', '@tiptap/starter-kit'],
          charts: ['chart.js', 'react-chartjs-2'],
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
    chunkSizeWarningLimit: 1000,
    cssMinify: true,
  },
});