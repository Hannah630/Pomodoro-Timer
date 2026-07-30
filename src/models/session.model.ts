/** One finished focus session, as it appears in the history list. */
export interface SessionRecord {
  readonly id: string;
  readonly title: string;
  /** The length the session began with, not the time actually spent at it. */
  readonly durationMs: number;
  readonly finishedAt: number;
}

/**
 * How many records to keep.
 *
 * Enough to cover weeks of use, and low enough that the list stays quick to
 * render and the save stays small. Nobody scrolls back further than this.
 */
export const MAX_HISTORY_RECORDS = 100;
