import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['contracts/**', 'backend/**', 'node_modules/**', 'dist/**', '.next/**', 'e2e/**'],
    coverage: {
      provider: 'v8',
      // @ts-expect-error: Vitest coverage Options type might not declare all property in older versions
      all: true,
      include: ['src/**'],
      exclude: [
        'contracts/**',
        'backend/**',
        'node_modules/**',
        'dist/**',
        '.next/**',
        '*.config.*',
        'e2e/**',
        'src/lib/database.types.ts',
        'src/app/**/*.css',
        'src/app/icon.svg',
        'src/app/apple-icon.png',
        'src/app/opengraph-image.png'
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
