import {
  SECONDS_PER_MINUTE,
  type TimerSettings,
} from '../models/timer.model';
import type { KeyValueStorage } from './key-value-storage';

export const STORAGE_KEY = 'pomodoro-timer';

/**
 * Bump when the saved shape changes.
 *
 * 1: durations in whole minutes, with a separate long break and a cycle length
 * 2: durations in seconds, otherwise unchanged
 * 3: one break, so the long break and the cycle length are gone
 *
 * Upgrading in place rather than discarding: a save that is merely old is not
 * a corrupt one, and dropping it would silently reset durations people chose.
 */
export const STORAGE_VERSION = 3;

export interface PersistedState {
  readonly settings: Partial<TimerSettings>;
  readonly completedFocusCount: number;
  /** Lifetime focus time, kept beside the count for the same reason. */
  readonly totalFocusMs: number;
}

export interface StorageService {
  load(): PersistedState | null;
  save(state: PersistedState): void;
}

/**
 * Reads and writes the state that survives a reload.
 *
 * It checks the envelope only: parseable, an object, the expected version.
 * Whether a duration is sensible is the timer service's question, and it
 * already validates everything it is handed, so there is no second copy of
 * that rule here.
 */
export function createStorageService(
  storage: KeyValueStorage,
): StorageService {
  return {
    load() {
      const raw = storage.getItem(STORAGE_KEY);

      if (raw === null) {
        return null;
      }

      const parsed = parseJson(raw);

      if (!isRecord(parsed)) {
        return null;
      }

      const settings = parsed['settings'];
      const savedSettings = isRecord(settings) ? settings : {};

      const settingsFor = upgradeSettings(parsed['version'], savedSettings);

      if (settingsFor === null) {
        return null;
      }

      return {
        settings: settingsFor,
        completedFocusCount: readCount(parsed['completedFocusCount']),
        // Only ever written by version 3; older saves start it from zero,
        // which is the one honest answer available.
        totalFocusMs: readCount(parsed['totalFocusMs']),
      };
    },

    save(state) {
      const payload = JSON.stringify({ version: STORAGE_VERSION, ...state });

      try {
        storage.setItem(STORAGE_KEY, payload);
      } catch {
        // Storage can be full, or blocked entirely in private browsing.
        // Losing a save is not a reason to break a running timer.
      }
    },
  };
}

const V1_TO_V2_FIELDS: ReadonlyArray<{ from: string; to: string }> = [
  { from: 'focusMinutes', to: 'focusSeconds' },
  { from: 'shortBreakMinutes', to: 'shortBreakSeconds' },
  { from: 'longBreakMinutes', to: 'longBreakSeconds' },
];

/**
 * Brings saved settings up to the current shape, one version at a time.
 *
 * Chaining the steps rather than writing a direct path per version means the
 * next bump only has to describe the difference it introduces, instead of
 * every route into it.
 *
 * Returns null for a version this build has never heard of.
 */
function upgradeSettings(
  version: unknown,
  saved: Record<string, unknown>,
): Partial<TimerSettings> | null {
  switch (version) {
    case STORAGE_VERSION:
      return saved as Partial<TimerSettings>;
    case 2:
      return dropTheLongBreak(saved);
    case 1:
      return dropTheLongBreak(minutesToSeconds(saved));
    default:
      return null;
  }
}

/**
 * Version 1 to 2.
 *
 * Only fields that are actually numbers are converted; anything else is left
 * out, and the timer service then falls back to its default for it, exactly
 * as it does for a malformed current save.
 */
function minutesToSeconds(
  saved: Record<string, unknown>,
): Record<string, unknown> {
  const upgraded: Record<string, unknown> = {};

  V1_TO_V2_FIELDS.forEach(({ from, to }) => {
    const minutes = saved[from];

    if (typeof minutes === 'number' && Number.isFinite(minutes)) {
      upgraded[to] = minutes * SECONDS_PER_MINUTE;
    }
  });

  return upgraded;
}

/**
 * Version 2 to 3.
 *
 * The short break becomes the only break. The long break and the cycle length
 * are dropped rather than merged: there is nowhere left to put them, and the
 * short break is the one that was actually being used.
 */
function dropTheLongBreak(
  saved: Record<string, unknown>,
): Partial<TimerSettings> {
  const upgraded: { -readonly [K in keyof TimerSettings]?: number } = {};

  if (isFiniteNumber(saved['focusSeconds'])) {
    upgraded.focusSeconds = saved['focusSeconds'];
  }

  if (isFiniteNumber(saved['shortBreakSeconds'])) {
    upgraded.breakSeconds = saved['shortBreakSeconds'];
  }

  return upgraded;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Storage is the only source of the completed count, so it is checked here
 * once rather than again in the timer service.
 */
function readCount(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}
