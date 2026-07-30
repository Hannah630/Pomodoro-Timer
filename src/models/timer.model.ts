/**
 * Domain types and constants for the pomodoro timer.
 *
 * This module is pure data: no logic, no side effects, no dependencies.
 * Everything else in the app may depend on it, but it depends on nothing.
 */

/**
 * Which kind of session the timer is counting down.
 *
 * There is one kind of break. The long break every fourth session is the
 * classic shape of the technique, but it was carrying a cycle length, a
 * second set of durations and a numbering scheme for a distinction nobody
 * here was making. Alternating is the whole rule now.
 */
export type TimerMode = 'focus' | 'break';

/**
 * Whether the countdown is running.
 *
 * Modelled as a union rather than a pair of booleans so that impossible
 * combinations (running and paused at the same time) cannot be expressed.
 */
export type TimerStatus = 'idle' | 'running' | 'paused';

/**
 * User-configurable durations, in seconds.
 *
 * One number per duration rather than a minutes and seconds pair: the split
 * belongs to the form, and storing it would mean validating two fields that
 * can disagree with each other.
 */
export interface TimerSettings {
  readonly focusSeconds: number;
  readonly breakSeconds: number;
}

/** A read-only snapshot of the timer, handed out to subscribers. */
export interface TimerState {
  readonly mode: TimerMode;
  readonly status: TimerStatus;
  /** The single source of truth for how much time is left. */
  readonly remainingMs: number;
  readonly completedFocusCount: number;
}

export const MS_PER_SECOND = 1_000;
export const SECONDS_PER_MINUTE = 60;
export const MS_PER_MINUTE = MS_PER_SECOND * SECONDS_PER_MINUTE;

/** Bounds every session duration is held to, wherever it comes from. */
export const MIN_SESSION_SECONDS = 5;
export const MAX_SESSION_SECONDS = 120 * SECONDS_PER_MINUTE;

export const DEFAULT_SETTINGS: TimerSettings = {
  focusSeconds: 25 * SECONDS_PER_MINUTE,
  breakSeconds: 5 * SECONDS_PER_MINUTE,
};
