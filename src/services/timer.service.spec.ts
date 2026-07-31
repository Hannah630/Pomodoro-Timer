import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_SETTINGS,
  MAX_SESSION_SECONDS,
  MIN_SESSION_SECONDS,
  MS_PER_SECOND,
  SECONDS_PER_MINUTE,
} from '../models/timer.model';
import { TimerService, type TimerServiceOptions } from './timer.service';

const FOCUS_MS = DEFAULT_SETTINGS.focusSeconds * MS_PER_SECOND;
const BREAK_MS = DEFAULT_SETTINGS.breakSeconds * MS_PER_SECOND;

const createdTimers: TimerService[] = [];

/**
 * Builds a timer whose clock the test controls, so a 25 minute countdown can
 * be exercised without waiting 25 minutes.
 */
function createTimer(options: Omit<TimerServiceOptions, 'now'> = {}) {
  let currentTime = 0;

  const service = new TimerService({ ...options, now: () => currentTime });
  createdTimers.push(service);

  return {
    service,
    advance: (ms: number) => {
      currentTime += ms;
    },
  };
}

/** Runs the current mode all the way down to zero. */
function runToCompletion(
  service: TimerService,
  advance: (ms: number) => void,
): void {
  const { remainingMs } = service.getState();

  service.start();
  advance(remainingMs);
  service.tick();
}

afterEach(() => {
  createdTimers.forEach((service) => service.dispose());
  createdTimers.length = 0;
});

describe('TimerService', () => {
  describe('initial state', () => {
    it('starts idle in focus mode with a full session and no completed rounds', () => {
      const { service } = createTimer();

      expect(service.getState()).toEqual({
        mode: 'focus',
        status: 'idle',
        remainingMs: FOCUS_MS,
        completedFocusCount: 0,
      });
    });
  });

  describe('session duration', () => {
    it('reports the full length of the current mode', () => {
      const { service, advance } = createTimer();

      expect(service.getSessionDurationMs()).toBe(FOCUS_MS);

      runToCompletion(service, advance);

      expect(service.getSessionDurationMs()).toBe(BREAK_MS);
    });

    it('follows a settings change made while idle', () => {
      const { service } = createTimer();

      service.updateSettings({ focusSeconds: 10 * SECONDS_PER_MINUTE });

      expect(service.getSessionDurationMs()).toBe(
        10 * SECONDS_PER_MINUTE * MS_PER_SECOND,
      );
    });

    it('holds still when the settings change mid-session', () => {
      const { service, advance } = createTimer();

      service.start();
      advance(60_000);
      service.updateSettings({ focusSeconds: 10 * SECONDS_PER_MINUTE });
      service.tick();

      // The running session keeps the length it began with, so the share of it
      // still remaining cannot jump under the user.
      expect(service.getSessionDurationMs()).toBe(FOCUS_MS);
    });
  });

  describe('choosing a mode by hand', () => {
    it('switches to the chosen mode, stopped and at full length', () => {
      const { service, advance } = createTimer();

      service.start();
      advance(60_000);
      service.tick();
      service.selectMode('break');

      expect(service.getState()).toMatchObject({
        mode: 'break',
        status: 'idle',
        remainingMs: BREAK_MS,
      });
    });

    it('ignores a choice of the mode already running', () => {
      const { service, advance } = createTimer();

      service.start();
      advance(60_000);
      service.tick();
      service.selectMode('focus');

      expect(service.getState()).toMatchObject({
        status: 'running',
        remainingMs: FOCUS_MS - 60_000,
      });
    });

    it('leaves the finished count alone', () => {
      const { service, advance } = createTimer();

      runToCompletion(service, advance);
      service.selectMode('focus');

      expect(service.getState().completedFocusCount).toBe(1);
    });

    it('tells subscribers about the switch', () => {
      const { service } = createTimer();
      const listener = vi.fn();

      service.subscribe(listener);
      service.selectMode('break');

      expect(listener).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ mode: 'break' }),
      );
    });
  });

  describe('start, pause and resume', () => {
    it('switches to running on start', () => {
      const { service } = createTimer();

      service.start();

      expect(service.getState().status).toBe('running');
    });

    it('counts down as time passes', () => {
      const { service, advance } = createTimer();

      service.start();
      advance(1_000);
      service.tick();

      expect(service.getState().remainingMs).toBe(FOCUS_MS - 1_000);
    });

    it('freezes the remaining time while paused', () => {
      const { service, advance } = createTimer();

      service.start();
      advance(10_000);
      service.pause();

      advance(5_000);
      service.tick();

      expect(service.getState()).toMatchObject({
        status: 'paused',
        remainingMs: FOCUS_MS - 10_000,
      });
    });

    it('resumes from where it was paused', () => {
      const { service, advance } = createTimer();

      service.start();
      advance(10_000);
      service.pause();
      advance(5_000);

      service.start();
      advance(1_000);
      service.tick();

      expect(service.getState().remainingMs).toBe(FOCUS_MS - 11_000);
    });

    it('ignores a second start while already running', () => {
      const { service, advance } = createTimer();

      service.start();
      advance(1_000);
      service.start();
      service.tick();

      expect(service.getState().remainingMs).toBe(FOCUS_MS - 1_000);
    });
  });

  describe('reset', () => {
    it('returns to a full session of the current mode', () => {
      const { service, advance } = createTimer();

      service.start();
      advance(30_000);
      service.tick();
      service.reset();

      expect(service.getState()).toMatchObject({
        status: 'idle',
        remainingMs: FOCUS_MS,
      });
    });

    it('keeps the completed round count', () => {
      const { service, advance } = createTimer({ completedFocusCount: 2 });

      runToCompletion(service, advance);
      service.reset();

      expect(service.getState().completedFocusCount).toBe(3);
    });
  });

  describe('drift resistance', () => {
    it('derives the remaining time from the deadline, not from tick count', () => {
      const { service, advance } = createTimer();

      // A single late tick, as happens in a throttled background tab.
      service.start();
      advance(5_000);
      service.tick();

      expect(service.getState().remainingMs).toBe(FOCUS_MS - 5_000);
    });

    it('never reports a negative remaining time', () => {
      const { service, advance } = createTimer();

      service.start();
      advance(FOCUS_MS + 30_000);
      service.tick();

      expect(service.getState().remainingMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('mode transitions', () => {
    it('counts a finished focus session and moves to a break', () => {
      const { service, advance } = createTimer();

      runToCompletion(service, advance);

      expect(service.getState()).toEqual({
        mode: 'break',
        status: 'idle',
        remainingMs: BREAK_MS,
        completedFocusCount: 1,
      });
    });

    it('takes the same break however many sessions have gone before', () => {
      const { service, advance } = createTimer({ completedFocusCount: 3 });

      runToCompletion(service, advance);

      expect(service.getState()).toMatchObject({
        mode: 'break',
        remainingMs: BREAK_MS,
        completedFocusCount: 4,
      });
    });

    it('returns to focus after a break, without counting the break', () => {
      const { service, advance } = createTimer();

      runToCompletion(service, advance); // focus -> break
      runToCompletion(service, advance); // break -> focus

      expect(service.getState()).toMatchObject({
        mode: 'focus',
        remainingMs: FOCUS_MS,
        completedFocusCount: 1,
      });
    });
  });

  describe('settings', () => {
    it('applies a new duration immediately while idle', () => {
      const { service } = createTimer();

      service.updateSettings({ focusSeconds: 10 * SECONDS_PER_MINUTE });

      expect(service.getState().remainingMs).toBe(
        10 * SECONDS_PER_MINUTE * MS_PER_SECOND,
      );
    });

    it('does not disturb a session that is already running', () => {
      const { service, advance } = createTimer();

      service.start();
      advance(1_000);
      service.updateSettings({ focusSeconds: 10 * SECONDS_PER_MINUTE });
      service.tick();

      expect(service.getState().remainingMs).toBe(FOCUS_MS - 1_000);
    });

    it('uses the new duration for the next session of that mode', () => {
      const { service, advance } = createTimer();

      service.updateSettings({ breakSeconds: 3 * SECONDS_PER_MINUTE });
      runToCompletion(service, advance);

      expect(service.getState().remainingMs).toBe(
        3 * SECONDS_PER_MINUTE * MS_PER_SECOND,
      );
    });
  });

  describe('settings validation', () => {
    it('clamps a duration below the minimum', () => {
      const { service } = createTimer();

      service.updateSettings({ focusSeconds: 0 });

      expect(service.getSettings().focusSeconds).toBe(MIN_SESSION_SECONDS);
    });

    it('clamps a negative duration', () => {
      const { service } = createTimer();

      service.updateSettings({ breakSeconds: -5 });

      expect(service.getSettings().breakSeconds).toBe(MIN_SESSION_SECONDS);
    });

    it('clamps a duration above the maximum', () => {
      const { service } = createTimer();

      service.updateSettings({ breakSeconds: 999_999 });

      expect(service.getSettings().breakSeconds).toBe(MAX_SESSION_SECONDS);
    });

    it('rounds a fractional duration to whole seconds', () => {
      const { service } = createTimer();

      service.updateSettings({ focusSeconds: 12.6 });

      expect(service.getSettings().focusSeconds).toBe(13);
    });

    it('keeps the current value when handed something that is not a number', () => {
      const { service } = createTimer();

      service.updateSettings({ focusSeconds: Number.NaN });
      service.updateSettings({
        breakSeconds: 'abc' as unknown as number,
      });

      expect(service.getSettings()).toMatchObject({
        focusSeconds: DEFAULT_SETTINGS.focusSeconds,
        breakSeconds: DEFAULT_SETTINGS.breakSeconds,
      });
    });

    it('validates settings supplied at construction, not just through the form', () => {
      const { service } = createTimer({
        settings: { focusSeconds: 999_999, breakSeconds: Number.NaN },
      });

      expect(service.getSettings()).toMatchObject({
        focusSeconds: MAX_SESSION_SECONDS,
        breakSeconds: DEFAULT_SETTINGS.breakSeconds,
      });
    });
  });

  describe('subscriptions', () => {
    it('notifies subscribers when the state changes', () => {
      const { service, advance } = createTimer();
      const listener = vi.fn();

      service.subscribe(listener);
      service.start();
      advance(1_000);
      service.tick();

      expect(listener).toHaveBeenCalledTimes(2);
      expect(listener).toHaveBeenLastCalledWith(
        expect.objectContaining({ remainingMs: FOCUS_MS - 1_000 }),
      );
    });

    it('stops notifying after unsubscribing', () => {
      const { service } = createTimer();
      const listener = vi.fn();

      const unsubscribe = service.subscribe(listener);
      unsubscribe();
      service.start();

      expect(listener).not.toHaveBeenCalled();
    });

    it('reports the finished mode, the next one and the length that ran', () => {
      const { service, advance } = createTimer();
      const listener = vi.fn();

      service.onComplete(listener);
      runToCompletion(service, advance);

      expect(listener).toHaveBeenCalledExactlyOnceWith(
        'focus',
        'break',
        FOCUS_MS,
      );
    });

    it('reports the length the session began with, not the current setting', () => {
      const { service, advance } = createTimer();
      const listener = vi.fn();

      service.onComplete(listener);
      service.start();
      service.updateSettings({ focusSeconds: 10 * SECONDS_PER_MINUTE });
      advance(FOCUS_MS);
      service.tick();

      expect(listener).toHaveBeenCalledExactlyOnceWith(
        'focus',
        'break',
        FOCUS_MS,
      );
    });
  });
});
