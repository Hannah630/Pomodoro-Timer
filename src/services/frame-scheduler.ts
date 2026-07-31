import type { TickScheduler } from './tick-scheduler';

/**
 * The slow clock that keeps running when the fast one stops.
 *
 * A hidden tab throttles this heavily — a second becomes several — but the
 * deadline is recomputed from the clock on every tick, so a late tick only
 * delays noticing that zero has passed. It never loses time.
 */
const BACKGROUND_INTERVAL_MS = 1_000;

/**
 * The scheduler the browser gets: a frame clock and a slow clock together.
 *
 * requestAnimationFrame alone would be wrong. It stops entirely while the tab
 * is hidden, so a session finishing in the background would raise no chime and
 * no notification until the user came back and looked — and telling someone
 * their time is up while they are elsewhere is the entire point of the
 * notification.
 *
 * setInterval alone is what this replaces: sixty ticks a second, carrying on
 * at that rate against a tab nobody is looking at.
 *
 * So: rAF drives the display while it is worth displaying, and a one second
 * interval underneath makes sure the end of a session is still noticed. Both
 * call the same tick, which is idempotent — it recomputes from the deadline
 * rather than accumulating — so two callers cost nothing but a wasted
 * subtraction.
 */
export function createFrameScheduler(): TickScheduler {
  let frameId: number | null = null;
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const scheduler: TickScheduler = {
    start(tick) {
      scheduler.stop();

      const onFrame = (): void => {
        tick();
        // Requested one at a time rather than in a loop: if the tick above
        // finished the session, `stop` has already run and this line is the
        // only thing that would start it up again.
        if (frameId !== null) {
          frameId = requestAnimationFrame(onFrame);
        }
      };

      frameId = requestAnimationFrame(onFrame);
      intervalId = setInterval(tick, BACKGROUND_INTERVAL_MS);
    },

    stop() {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
        frameId = null;
      }

      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    },
  };

  return scheduler;
}
