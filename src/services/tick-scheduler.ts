/**
 * Whatever it is that asks the timer to recompute itself.
 *
 * Separated from the timer because how often to look at the clock is a
 * question about the environment, not about pomodoros: a browser tab wants a
 * frame, a headless test wants nothing at all.
 */
export interface TickScheduler {
  /** Begins calling `tick`. Calling it again replaces any previous schedule. */
  start(tick: () => void): void;
  stop(): void;
}

/**
 * How often a running timer recomputes the remaining time.
 *
 * Roughly a frame, because the display carries hundredths of a second. The
 * deadline is recomputed from the clock every time, so a tick arriving late
 * costs nothing but a skipped frame.
 */
export const TICK_INTERVAL_MS = 16;

/**
 * The plain one, and the timer's default.
 *
 * setInterval exists in node as well as in browsers, which is what lets
 * TimerService be constructed in a spec without anything being stubbed.
 */
export function createIntervalScheduler(
  intervalMs: number = TICK_INTERVAL_MS,
): TickScheduler {
  let id: ReturnType<typeof setInterval> | null = null;

  const scheduler: TickScheduler = {
    start(tick) {
      scheduler.stop();
      id = setInterval(tick, intervalMs);
    },

    stop() {
      if (id !== null) {
        clearInterval(id);
        id = null;
      }
    },
  };

  return scheduler;
}
