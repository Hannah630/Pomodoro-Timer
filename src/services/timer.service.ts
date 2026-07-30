import {
  DEFAULT_SETTINGS,
  MAX_SESSION_SECONDS,
  MIN_ROUNDS_PER_LONG_BREAK,
  MIN_SESSION_SECONDS,
  MS_PER_SECOND,
  type TimerMode,
  type TimerSettings,
  type TimerState,
  type TimerStatus,
} from '../models/timer.model';

export type StateListener = (state: TimerState) => void;
export type CompleteListener = (
  finished: TimerMode,
  next: TimerMode,
  /** How long the finished session actually ran for. */
  durationMs: number,
) => void;
export type Unsubscribe = () => void;

export interface TimerServiceOptions {
  /** Partial because restored settings may be incomplete or out of range. */
  settings?: Partial<TimerSettings>;
  completedFocusCount?: number;
  /** Injected so tests can drive time without waiting for it to pass. */
  now?: () => number;
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
  private remainingMs = 0;
  private completedFocusCount: number;

  /**
   * The length this session began with.
   *
   * Kept rather than recomputed, because a settings change mid-session must
   * not retroactively change how long the running session is taken to be.
   */
  private sessionDurationMs = 0;

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
    this.beginSession(this.mode);
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
    return this.sessionDurationMs;
  }

  /**
   * What this session leads to, asked before it has finished.
   *
   * Same rule as the transition itself, applied to the count as it will be
   * once the session lands, so the UI can say what is coming without
   * restating the rule.
   */
  getNextMode(): TimerMode {
    return this.mode === 'focus'
      ? this.breakAfterFocus(this.completedFocusCount + 1)
      : 'focus';
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
    this.beginSession(this.mode);
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
      this.beginSession(this.mode);
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
    const finishedDurationMs = this.sessionDurationMs;

    if (finished === 'focus') {
      this.completedFocusCount += 1;
    }

    const next = this.nextModeAfter(finished);
    this.status = 'idle';
    this.endAt = null;
    this.beginSession(next);

    this.emitState();
    this.completeListeners.forEach((listener) =>
      listener(finished, next, finishedDurationMs),
    );
  }

  /** Enters a mode at its full length, fixing that length for the session. */
  private beginSession(mode: TimerMode): void {
    this.mode = mode;
    this.sessionDurationMs = this.durationMsFor(mode);
    this.remainingMs = this.sessionDurationMs;
  }

  private nextModeAfter(finished: TimerMode): TimerMode {
    return finished === 'focus'
      ? this.breakAfterFocus(this.completedFocusCount)
      : 'focus';
  }

  /** A long break lands on every whole cycle of finished focus sessions. */
  private breakAfterFocus(focusCount: number): TimerMode {
    const isLongBreakDue = focusCount % this.settings.roundsPerLongBreak === 0;

    return isLongBreakDue ? 'longBreak' : 'shortBreak';
  }

  private durationMsFor(mode: TimerMode): number {
    switch (mode) {
      case 'focus':
        return this.settings.focusSeconds * MS_PER_SECOND;
      case 'shortBreak':
        return this.settings.shortBreakSeconds * MS_PER_SECOND;
      case 'longBreak':
        return this.settings.longBreakSeconds * MS_PER_SECOND;
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
    focusSeconds: sanitizeSeconds(patch.focusSeconds, current.focusSeconds),
    shortBreakSeconds: sanitizeSeconds(
      patch.shortBreakSeconds,
      current.shortBreakSeconds,
    ),
    longBreakSeconds: sanitizeSeconds(
      patch.longBreakSeconds,
      current.longBreakSeconds,
    ),
    roundsPerLongBreak: sanitizeRounds(
      patch.roundsPerLongBreak,
      current.roundsPerLongBreak,
    ),
  };
}

function sanitizeSeconds(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return clamp(Math.round(value), MIN_SESSION_SECONDS, MAX_SESSION_SECONDS);
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
