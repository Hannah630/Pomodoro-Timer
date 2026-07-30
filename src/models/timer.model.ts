/**
 * Domain types and constants for the pomodoro timer.
 *
 * This module is pure data: no logic, no side effects, no dependencies.
 * Everything else in the app may depend on it, but it depends on nothing.
 */

/** Which kind of session the timer is currently counting down. */
export type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

/**
 * Whether the countdown is running.
 *
 * Modelled as a union rather than a pair of booleans so that impossible
 * combinations (running and paused at the same time) cannot be expressed.
 */
export type TimerStatus = 'idle' | 'running' | 'paused';

/** User-configurable durations. Minutes, because that is what the UI edits. */
export interface TimerSettings {
  readonly focusMinutes: number;
  readonly shortBreakMinutes: number;
  readonly longBreakMinutes: number;
  /** How many focus sessions to finish before taking a long break. */
  readonly roundsPerLongBreak: number;
}

/** A read-only snapshot of the timer, handed out to subscribers. */
export interface TimerState {
  readonly mode: TimerMode;
  readonly status: TimerStatus;
  /** The single source of truth for how much time is left. */
  readonly remainingMs: number;
  readonly completedFocusCount: number;
}

export const MS_PER_MINUTE = 60_000;

export const DEFAULT_SETTINGS: TimerSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  roundsPerLongBreak: 4,
};
