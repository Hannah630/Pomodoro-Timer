/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // The timer logic is plain TypeScript with no DOM dependency,
    // so tests can run in the faster node environment.
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    // Temporary: the skeleton has no specs yet. Remove once Stage 1 lands.
    passWithNoTests: true,
  },
});
