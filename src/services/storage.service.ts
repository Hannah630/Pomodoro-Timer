import {
  SECONDS_PER_MINUTE,
  type TimerSettings,
} from '../models/timer.model';
import type { KeyValueStorage } from './key-value-storage';

export const STORAGE_KEY = 'pomodoro-timer';

/**
 * Bump when the saved shape changes.
 *
 * Version 1 stored durations as whole minutes; version 2 stores seconds.
 * Upgrading in place matters here: dropping the save instead would silently
 * reset durations the user had chosen.
 */
export const STORAGE_VERSION = 2;

export interface PersistedState {
  readonly settings: Partial<TimerSettings>;
  readonly completedFocusCount: number;
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

      switch (parsed['version']) {
        case STORAGE_VERSION:
          return {
            settings: savedSettings as Partial<TimerSettings>,
            completedFocusCount: readCount(parsed['completedFocusCount']),
          };

        case 1:
          return {
            settings: upgradeMinutesToSeconds(savedSettings),
            completedFocusCount: readCount(parsed['completedFocusCount']),
          };

        default:
          return null;
      }
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

type DurationKey = Extract<
  keyof TimerSettings,
  'focusSeconds' | 'shortBreakSeconds' | 'longBreakSeconds'
>;

const V1_DURATION_FIELDS: ReadonlyArray<{ from: string; to: DurationKey }> = [
  { from: 'focusMinutes', to: 'focusSeconds' },
  { from: 'shortBreakMinutes', to: 'shortBreakSeconds' },
  { from: 'longBreakMinutes', to: 'longBreakSeconds' },
];

/**
 * Carries a version 1 save forward.
 *
 * Only fields that are actually numbers are converted; anything else is left
 * out, and the timer service then falls back to its default for it, exactly
 * as it does for a malformed current save.
 */
function upgradeMinutesToSeconds(
  saved: Record<string, unknown>,
): Partial<TimerSettings> {
  const upgraded: { -readonly [K in keyof TimerSettings]?: number } = {};

  V1_DURATION_FIELDS.forEach(({ from, to }) => {
    const minutes = saved[from];

    if (typeof minutes === 'number' && Number.isFinite(minutes)) {
      upgraded[to] = minutes * SECONDS_PER_MINUTE;
    }
  });

  const rounds = saved['roundsPerLongBreak'];
  if (typeof rounds === 'number' && Number.isFinite(rounds)) {
    upgraded.roundsPerLongBreak = rounds;
  }

  return upgraded;
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
