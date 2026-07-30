import { describe, expect, it } from 'vitest';

import { isSameDay } from './history-view';

/** Built from local parts, since the check itself is in local time. */
function at(
  year: number,
  month: number,
  day: number,
  hour = 12,
  minute = 0,
): number {
  return new Date(year, month - 1, day, hour, minute).getTime();
}

describe('isSameDay', () => {
  it('is true for two times on the same date', () => {
    expect(isSameDay(at(2026, 7, 30, 9, 5), at(2026, 7, 30, 23, 59))).toBe(true);
  });

  it('is false across midnight', () => {
    expect(isSameDay(at(2026, 7, 30, 23, 59), at(2026, 7, 31, 0, 1))).toBe(
      false,
    );
  });

  it('is false for the same date in a different month', () => {
    expect(isSameDay(at(2026, 6, 30), at(2026, 7, 30))).toBe(false);
  });

  it('is false for the same date in a different year', () => {
    expect(isSameDay(at(2025, 7, 30), at(2026, 7, 30))).toBe(false);
  });
});
