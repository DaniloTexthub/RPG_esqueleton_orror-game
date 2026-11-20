import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    minify: 'esbuild',
    target: 'es2020'
  },
  server: {
    port: 5173,
    open: true
  },
  resolve: {
    alias: {
      '@': '/src',
      '@core': '/src/core',
      '@systems': '/src/systems',
      '@components': '/src/components',
      '@scenes': '/src/scenes',
      '@map': '/src/map',
      '@entities': '/src/entities',
      '@renderer': '/src/renderer',
      '@utils': '/src/utils',
      '@assets': '/src/assets'
    }
  }
});