import { defineConfig } from 'vitest/config';

export default defineConfig(({ command }) => ({
  /**
   * GitHub Pages serves this project from /Pomodoro-Timer/, not from the
   * domain root, so built asset URLs need that prefix. Only the build does:
   * the dev server stays at / where it is easier to reach.
   *
   * Declared here rather than passed as --base, because Git Bash on Windows
   * rewrites a leading slash into a filesystem path before Vite ever sees it.
   */
  base: command === 'build' ? '/Pomodoro-Timer/' : '/',

  test: {
    // The timer logic is plain TypeScript with no DOM dependency,
    // so tests can run in the faster node environment.
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
}));
