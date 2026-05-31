import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['contracts/**', 'backend/**', 'node_modules/**', 'dist/**', '.next/**', 'e2e/**'],
    coverage: {
      provider: 'v8',
      exclude: ['contracts/**', 'backend/**', 'node_modules/**', 'dist/**', '.next/**', '*.config.*', 'e2e/**']
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
