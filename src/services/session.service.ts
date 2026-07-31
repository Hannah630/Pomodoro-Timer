import {
  MAX_HISTORY_RECORDS,
  type SessionRecord,
} from '../models/session.model';

/** Long enough to name a task, short enough to stay on one line. */
export const MAX_TITLE_LENGTH = 20;

export interface SessionServiceOptions {
  history?: readonly SessionRecord[];
  totalFocusMs?: number;
  /** Restored from storage, and normalized on the way in like any other. */
  title?: string;
  /** Injected so specs can record sessions without waiting for the clock. */
  now?: () => number;
  /** Injected so specs get stable ids instead of random ones. */
  createId?: () => string;
}

export interface SessionService {
  getTitle(): string;
  setTitle(raw: string): void;

  getHistory(): readonly SessionRecord[];

  /**
   * Focus time over the life of the app.
   *
   * Accumulated rather than added up from the history, which is capped by
   * count and by age and can be cleared outright. Summing the list would
   * quietly report less the longer the app is used.
   */
  getTotalFocusMs(): number;

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

  // Normalized rather than trusted: a restored title has been through
  // localStorage, where anything could have been written over it, and nothing
  // downstream of here would catch an over-long one.
  let title = normalizeTitle(options.title ?? '');
  let history: readonly SessionRecord[] = options.history ?? [];
  let totalFocusMs = options.totalFocusMs ?? 0;

  return {
    getTitle: () => title,

    setTitle(raw) {
      // The title deliberately survives a finished session: working through
      // several pomodoros on one task is the normal case, so retyping it every
      // time would be busywork.
      title = normalizeTitle(raw);
    },

    getHistory: () => history,

    getTotalFocusMs: () => totalFocusMs,

    recordCompletedFocus(durationMs) {
      totalFocusMs += durationMs;

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
      // The lifetime total is deliberately untouched: clearing the list is
      // tidying up, not undoing the work.
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
