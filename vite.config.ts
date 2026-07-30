/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // The timer logic is plain TypeScript with no DOM dependency,
    // so tests can run in the faster node environment.
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
});
