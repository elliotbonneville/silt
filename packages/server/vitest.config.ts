import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['**/__tests__/**', '**/*.test.ts', 'dist/**', 'node_modules/**'],
    },
  },
  resolve: {
    alias: {
      '@silt/shared': resolve(__dirname, '../shared/src/index.ts'),
    },
  },
});
