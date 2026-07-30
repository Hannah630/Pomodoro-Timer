import {
  DEFAULT_SETTINGS,
  MAX_SESSION_MINUTES,
  MIN_ROUNDS_PER_LONG_BREAK,
  MIN_SESSION_MINUTES,
  MS_PER_MINUTE,
  type TimerMode,
  type TimerSettings,
  type TimerState,
  type TimerStatus,
} from '../models/timer.model';

export type StateListener = (state: TimerState) => void;
export type CompleteListener = (finished: TimerMode, next: TimerMode) => void;
export type Unsubscribe = () => void;

export interface TimerServiceOptions {
  /** Partial because restored settings may be incomplete or out of range. */
  settings?: Partial<TimerSettings>;
  completedFocusCount?: number;
  /** Injected so tests can drive time without waiting for it to pass. */
  now?: () => number;
}

/**
 * How often a running timer recomputes the remaining time. Faster than once
 * per second so the displayed value flips close to the real second boundary.
 */
export const TICK_INTERVAL_MS = 250;

/**
 * The pomodoro state machine.
 *
 * Owns every business rule about time and mode transitions, and nothing else:
 * it never touches the DOM, storage, or audio. Callers observe it through
 * `subscribe` and `onComplete`, which is what keeps it unit testable.
 */
export class TimerService {
  private settings: TimerSettings;
  private mode: TimerMode = 'focus';
  private status: TimerStatus = 'idle';
  private remainingMs: number;
  private completedFocusCount: number;

  /** Timestamp the current run finishes at; null unless running. */
  private endAt: number | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  private readonly now: () => number;
  private readonly stateListeners = new Set<StateListener>();
  private readonly completeListeners = new Set<CompleteListener>();

  constructor(options: TimerServiceOptions = {}) {
    this.settings = sanitizeSettings(options.settings ?? {}, DEFAULT_SETTINGS);
    this.completedFocusCount = options.completedFocusCount ?? 0;
    this.now = options.now ?? (() => Date.now());
    this.remainingMs = this.durationMsFor(this.mode);
  }

  getState(): TimerState {
    return {
      mode: this.mode,
      status: this.status,
      remainingMs: this.remainingMs,
      completedFocusCount: this.completedFocusCount,
    };
  }

  getSettings(): TimerSettings {
    return this.settings;
  }

  /**
   * Full length of the current mode. The UI needs it to turn the remaining
   * time into a progress fraction.
   */
  getSessionDurationMs(): number {
    return this.durationMsFor(this.mode);
  }

  /**
   * Starts an idle timer or resumes a paused one. Both cases do the same
   * thing: aim at a deadline `remainingMs` into the future.
   */
  start(): void {
    if (this.status === 'running') {
      return;
    }

    this.endAt = this.now() + this.remainingMs;
    this.status = 'running';
    this.startInterval();
    this.emitState();
  }

  pause(): void {
    if (this.status !== 'running' || this.endAt === null) {
      return;
    }

    this.remainingMs = Math.max(0, this.endAt - this.now());
    this.status = 'paused';
    this.endAt = null;
    this.stopInterval();
    this.emitState();
  }

  /** Returns to the start of the current mode without changing the count. */
  reset(): void {
    this.stopInterval();
    this.status = 'idle';
    this.endAt = null;
    this.remainingMs = this.durationMsFor(this.mode);
    this.emitState();
  }

  /**
   * Recomputes the remaining time from the deadline.
   *
   * The value is always derived from `endAt - now()` and never accumulated,
   * so a late interval — a throttled background tab, a busy main thread —
   * cannot make the countdown drift.
   *
   * Public because the interval is not the only caller: the UI also ticks
   * once when the tab becomes visible again, to refresh a stale display.
   */
  tick(): void {
    if (this.status !== 'running' || this.endAt === null) {
      return;
    }

    this.remainingMs = Math.max(0, this.endAt - this.now());

    if (this.remainingMs === 0) {
      this.complete();
      return;
    }

    this.emitState();
  }

  /**
   * Applies new durations. A change never interrupts a run in progress; it
   * takes effect the next time the affected mode starts.
   */
  updateSettings(patch: Partial<TimerSettings>): void {
    this.settings = sanitizeSettings(patch, this.settings);

    if (this.status === 'idle') {
      this.remainingMs = this.durationMsFor(this.mode);
    }

    this.emitState();
  }

  subscribe(listener: StateListener): Unsubscribe {
    this.stateListeners.add(listener);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  onComplete(listener: CompleteListener): Unsubscribe {
    this.completeListeners.add(listener);
    return () => {
      this.completeListeners.delete(listener);
    };
  }

  /** Releases the interval and listeners. */
  dispose(): void {
    this.stopInterval();
    this.stateListeners.clear();
    this.completeListeners.clear();
  }

  /** Handles a session reaching zero: count it, then move to the next mode. */
  private complete(): void {
    this.stopInterval();

    const finished = this.mode;
    if (finished === 'focus') {
      this.completedFocusCount += 1;
    }

    const next = this.nextModeAfter(finished);
    this.mode = next;
    this.status = 'idle';
    this.endAt = null;
    this.remainingMs = this.durationMsFor(next);

    this.emitState();
    this.completeListeners.forEach((listener) => listener(finished, next));
  }

  private nextModeAfter(finished: TimerMode): TimerMode {
    if (finished !== 'focus') {
      return 'focus';
    }

    const isLongBreakDue =
      this.completedFocusCount % this.settings.roundsPerLongBreak === 0;

    return isLongBreakDue ? 'longBreak' : 'shortBreak';
  }

  private durationMsFor(mode: TimerMode): number {
    switch (mode) {
      case 'focus':
        return this.settings.focusMinutes * MS_PER_MINUTE;
      case 'shortBreak':
        return this.settings.shortBreakMinutes * MS_PER_MINUTE;
      case 'longBreak':
        return this.settings.longBreakMinutes * MS_PER_MINUTE;
    }
  }

  private startInterval(): void {
    this.stopInterval();
    this.intervalId = setInterval(() => this.tick(), TICK_INTERVAL_MS);
  }

  private stopInterval(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private emitState(): void {
    const state = this.getState();
    this.stateListeners.forEach((listener) => listener(state));
  }
}

/**
 * Applies a patch on top of known-good settings, keeping the current value for
 * anything missing, malformed or out of range.
 *
 * The service owns this rule rather than the settings form, because settings
 * also arrive from storage on startup and that path never touches a form.
 */
function sanitizeSettings(
  patch: Partial<TimerSettings>,
  current: TimerSettings,
): TimerSettings {
  return {
    focusMinutes: sanitizeMinutes(patch.focusMinutes, current.focusMinutes),
    shortBreakMinutes: sanitizeMinutes(
      patch.shortBreakMinutes,
      current.shortBreakMinutes,
    ),
    longBreakMinutes: sanitizeMinutes(
      patch.longBreakMinutes,
      current.longBreakMinutes,
    ),
    roundsPerLongBreak: sanitizeRounds(
      patch.roundsPerLongBreak,
      current.roundsPerLongBreak,
    ),
  };
}

function sanitizeMinutes(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return clamp(Math.round(value), MIN_SESSION_MINUTES, MAX_SESSION_MINUTES);
}

function sanitizeRounds(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(MIN_ROUNDS_PER_LONG_BREAK, Math.round(value));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
