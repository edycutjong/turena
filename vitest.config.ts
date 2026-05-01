import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    exclude: ['contracts/**', 'backend/**', 'node_modules/**', 'dist/**', '.next/**'],
    coverage: {
      provider: 'v8',
      exclude: ['contracts/**', 'backend/**', 'node_modules/**', 'dist/**', '.next/**', '*.config.*']
    }
  }
})
