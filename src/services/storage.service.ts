import type { TimerSettings } from '../models/timer.model';

/**
 * Only the part of the Storage API this service uses.
 *
 * Depending on the narrow interface rather than on Storage keeps the service
 * testable without a browser, and states exactly what it needs.
 */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const STORAGE_KEY = 'pomodoro-timer';

/** Bump when the saved shape changes; saves from older shapes are ignored. */
export const STORAGE_VERSION = 1;

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

      if (!isRecord(parsed) || parsed['version'] !== STORAGE_VERSION) {
        return null;
      }

      const settings = parsed['settings'];

      return {
        settings: isRecord(settings) ? (settings as Partial<TimerSettings>) : {},
        completedFocusCount: readCount(parsed['completedFocusCount']),
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
