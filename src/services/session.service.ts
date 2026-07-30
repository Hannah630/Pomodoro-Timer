import {
  MAX_HISTORY_RECORDS,
  type SessionRecord,
} from '../models/session.model';

/** Long enough to name a task, short enough to stay on one line. */
export const MAX_TITLE_LENGTH = 20;

export interface SessionServiceOptions {
  history?: readonly SessionRecord[];
  /** Injected so specs can record sessions without waiting for the clock. */
  now?: () => number;
  /** Injected so specs get stable ids instead of random ones. */
  createId?: () => string;
}

export interface SessionService {
  getTitle(): string;
  setTitle(raw: string): void;

  getHistory(): readonly SessionRecord[];
  /** Files a finished focus session under the current title. */
  recordCompletedFocus(durationMs: number): void;
  clearHistory(): void;
}

/**
 * What the current session is about, and what the finished ones were.
 *
 * Like the timer, it holds state and rules but performs no side effects: main
 * decides when to write the history out.
 */
export function createSessionService(
  options: SessionServiceOptions = {},
): SessionService {
  const now = options.now ?? (() => Date.now());
  const createId = options.createId ?? (() => crypto.randomUUID());

  let title = '';
  let history: readonly SessionRecord[] = options.history ?? [];

  return {
    getTitle: () => title,

    setTitle(raw) {
      // The title deliberately survives a finished session: working through
      // several pomodoros on one task is the normal case, so retyping it every
      // time would be busywork.
      title = normalizeTitle(raw);
    },

    getHistory: () => history,

    recordCompletedFocus(durationMs) {
      const record: SessionRecord = {
        id: createId(),
        title,
        durationMs,
        finishedAt: now(),
      };

      // Newest first, which is both the reading order and the order to drop
      // from the far end of.
      history = [record, ...history].slice(0, MAX_HISTORY_RECORDS);
    },

    clearHistory() {
      history = [];
    },
  };
}

/**
 * Trims and caps a typed title.
 *
 * Counting code points rather than slicing the string keeps an emoji from
 * being cut in half at the limit, which would leave a broken character behind.
 */
export function normalizeTitle(raw: string): string {
  return [...raw.trim()].slice(0, MAX_TITLE_LENGTH).join('');
}
