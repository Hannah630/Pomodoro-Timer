import {
  DEFAULT_SETTINGS,
  MAX_SESSION_SECONDS,
  MIN_SESSION_SECONDS,
  MS_PER_SECOND,
  type TimerMode,
  type TimerSettings,
  type TimerState,
  type TimerStatus,
} from '../models/timer.model';
import { createIntervalScheduler, type TickScheduler } from './tick-scheduler';

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
  /**
   * What asks the timer to recompute itself.
   *
   * Defaults to a plain interval, which works in node as well as in a
   * browser, so a spec can construct this class without stubbing anything.
   * The app supplies a frame-based one instead.
   */
  scheduler?: TickScheduler;
}

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

  private readonly scheduler: TickScheduler;
  private readonly now: () => number;
  private readonly stateListeners = new Set<StateListener>();
  private readonly completeListeners = new Set<CompleteListener>();

  constructor(options: TimerServiceOptions = {}) {
    this.settings = sanitizeSettings(options.settings ?? {}, DEFAULT_SETTINGS);
    this.completedFocusCount = options.completedFocusCount ?? 0;
    this.now = options.now ?? (() => Date.now());
    this.scheduler = options.scheduler ?? createIntervalScheduler();
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
   * When the current run finishes, or null if nothing is running.
   *
   * Deliberately not part of `TimerState`: no view draws a deadline, and the
   * state is the model the views are given. What needs this is anything that
   * has to act at a moment the app may not be awake for — a notification
   * booked with the operating system when the session starts, rather than
   * fired by a tick that a suspended app will never take.
   */
  getEndAt(): number | null {
    return this.endAt;
  }

  /**
   * Which mode follows the one loaded now.
   *
   * The same rule `complete()` applies, exposed because the sentence a
   * completion announces has to be written before the session ends, not
   * after — and it names the mode coming next.
   */
  getNextMode(): TimerMode {
    return this.nextModeAfter(this.mode);
  }

  /**
   * Switches to a mode by hand, at its full length and stopped.
   *
   * Choosing the mode already running does nothing, so a stray click on the
   * current mode cannot throw away a session in progress. Restarting the
   * current one is what reset is for.
   */
  selectMode(mode: TimerMode): void {
    if (mode === this.mode) {
      return;
    }

    this.stopTicking();
    this.status = 'idle';
    this.endAt = null;
    this.beginSession(mode);
    this.emitState();
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
    this.startTicking();
    this.emitState();
  }

  pause(): void {
    if (this.status !== 'running' || this.endAt === null) {
      return;
    }

    this.remainingMs = Math.max(0, this.endAt - this.now());
    this.status = 'paused';
    this.endAt = null;
    this.stopTicking();
    this.emitState();
  }

  /** Returns to the start of the current mode without changing the count. */
  reset(): void {
    this.stopTicking();
    this.status = 'idle';
    this.endAt = null;
    this.beginSession(this.mode);
    this.emitState();
  }

  /**
   * Recomputes the remaining time from the deadline.
   *
   * The value is always derived from `endAt - now()` and never accumulated,
   * so a late tick — a throttled background tab, a busy main thread — cannot
   * make the countdown drift. It is idempotent for the same reason, which is
   * what lets the scheduler drive it from two clocks at once.
   *
   * Public because the scheduler is not the only caller: the UI also ticks
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

  /** Releases the scheduler and the listeners. */
  dispose(): void {
    this.stopTicking();
    this.stateListeners.clear();
    this.completeListeners.clear();
  }

  /** Handles a session reaching zero: count it, then move to the next mode. */
  private complete(): void {
    this.stopTicking();

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
    return finished === 'focus' ? 'break' : 'focus';
  }

  private durationMsFor(mode: TimerMode): number {
    switch (mode) {
      case 'focus':
        return this.settings.focusSeconds * MS_PER_SECOND;
      case 'break':
        return this.settings.breakSeconds * MS_PER_SECOND;
    }
  }

  private startTicking(): void {
    this.scheduler.start(() => this.tick());
  }

  private stopTicking(): void {
    this.scheduler.stop();
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
    breakSeconds: sanitizeSeconds(patch.breakSeconds, current.breakSeconds),
  };
}

function sanitizeSeconds(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return clamp(Math.round(value), MIN_SESSION_SECONDS, MAX_SESSION_SECONDS);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
