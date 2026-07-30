/** Long enough to name a task, short enough to stay on one line. */
export const MAX_TITLE_LENGTH = 20;

export interface SessionService {
  getTitle(): string;
  setTitle(raw: string): void;
}

/**
 * What the current session is about.
 *
 * The title deliberately survives a finished session: working through several
 * pomodoros on one task is the normal case, so retyping it every time would be
 * busywork.
 */
export function createSessionService(): SessionService {
  let title = '';

  return {
    getTitle: () => title,

    setTitle(raw) {
      title = normalizeTitle(raw);
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
