import { defineConfig } from 'vitest/config';

export default defineConfig(({ command, mode }) => ({
  /**
   * GitHub Pages serves this project from /Pomodoro-Timer/, not from the
   * domain root, so built asset URLs need that prefix. Two builds do not:
   * the dev server, which stays at / where it is easier to reach, and the
   * native one.
   *
   * A native shell loads the same files from the root of its own container,
   * so the Pages prefix would make every asset a 404 and the app a white
   * screen. `vite build --mode native` is the way out, and Vite's own flag
   * rather than an environment variable because npm scripts on Windows run
   * through cmd, where `FOO=bar command` is not a thing.
   *
   * Declared here rather than passed as --base, because Git Bash on Windows
   * rewrites a leading slash into a filesystem path before Vite ever sees it.
   */
  base: command === 'build' && mode !== 'native' ? '/Pomodoro-Timer/' : '/',

  test: {
    // The timer logic is plain TypeScript with no DOM dependency,
    // so tests can run in the faster node environment.
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
}));
