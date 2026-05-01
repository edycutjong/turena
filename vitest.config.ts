import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['contracts/**', 'backend/**', 'node_modules/**', 'dist/**', '.next/**'],
    coverage: {
      provider: 'v8',
      exclude: ['contracts/**', 'backend/**', 'node_modules/**', 'dist/**', '.next/**', '*.config.*']
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
