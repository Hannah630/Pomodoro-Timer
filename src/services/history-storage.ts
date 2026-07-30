import {
  MAX_HISTORY_AGE_DAYS,
  MAX_HISTORY_RECORDS,
  MS_PER_DAY,
  type SessionRecord,
} from '../models/session.model';
import type { KeyValueStorage } from './key-value-storage';

/**
 * A second key, kept apart from the settings save on purpose.
 *
 * History grows and settings do not, so writing one does not mean rewriting
 * the other — and a corrupted history cannot take the settings down with it.
 */
export const HISTORY_STORAGE_KEY = 'pomodoro-timer:history';

export const HISTORY_STORAGE_VERSION = 1;

export interface HistoryStorage {
  load(): SessionRecord[];
  save(records: readonly SessionRecord[]): void;
}

/**
 * Reads and writes the finished sessions.
 *
 * Unlike the settings save, nothing downstream validates a record: it goes
 * straight to the list on screen. So each one is checked here, and a single
 * bad entry is dropped rather than costing the user the whole history.
 */
export function createHistoryStorage(
  storage: KeyValueStorage,
  /** Injected so the age limit can be exercised without waiting months. */
  now: () => number = () => Date.now(),
): HistoryStorage {
  return {
    load() {
      const raw = storage.getItem(HISTORY_STORAGE_KEY);

      if (raw === null) {
        return [];
      }

      const parsed = parseJson(raw);

      if (
        !isRecord(parsed) ||
        parsed['version'] !== HISTORY_STORAGE_VERSION ||
        !Array.isArray(parsed['records'])
      ) {
        return [];
      }

      const oldestKept = now() - MAX_HISTORY_AGE_DAYS * MS_PER_DAY;

      return parsed['records']
        .filter(isSessionRecord)
        .filter((record) => record.finishedAt >= oldestKept)
        .slice(0, MAX_HISTORY_RECORDS);
    },

    save(records) {
      const payload = JSON.stringify({
        version: HISTORY_STORAGE_VERSION,
        records: records.slice(0, MAX_HISTORY_RECORDS),
      });

      try {
        storage.setItem(HISTORY_STORAGE_KEY, payload);
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

function isSessionRecord(value: unknown): value is SessionRecord {
  return (
    isRecord(value) &&
    typeof value['id'] === 'string' &&
    typeof value['title'] === 'string' &&
    isPositiveNumber(value['durationMs']) &&
    isPositiveNumber(value['finishedAt'])
  );
}

function isPositiveNumber(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}
