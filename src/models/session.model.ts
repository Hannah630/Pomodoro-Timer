/** One finished focus session, as it appears in the history list. */
export interface SessionRecord {
  readonly id: string;
  readonly title: string;
  /** The length the session began with, not the time actually spent at it. */
  readonly durationMs: number;
  readonly finishedAt: number;
}

/**
 * Retention: whichever limit bites first.
 *
 * The age limit is the one with meaning — "the last three months" is something
 * a person can hold in their head, where "the last 500" is not. The count is
 * the backstop that keeps the save small however heavily the app is used; at
 * roughly 130 bytes a record, 500 of them is about 65 KB, well inside the 5 MB
 * a browser allows.
 */
export const MAX_HISTORY_RECORDS = 500;
export const MAX_HISTORY_AGE_DAYS = 90;

export const MS_PER_DAY = 24 * 60 * 60 * 1_000;
