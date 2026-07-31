import { describe, expect, it } from 'vitest';

import { formatLocalTime } from './local-time-view';

describe('formatLocalTime', () => {
  it('reads as a date and a wall clock', () => {
    expect(formatLocalTime(new Date(2026, 6, 31, 14, 32))).toBe(
      '2026/07/31 14:32',
    );
  });

  it('pads the month, the day and both halves of the time', () => {
    expect(formatLocalTime(new Date(2026, 0, 5, 9, 5))).toBe(
      '2026/01/05 09:05',
    );
  });

  it('counts months from one, as anyone reading a date does', () => {
    expect(formatLocalTime(new Date(2026, 11, 25, 12, 0))).toBe(
      '2026/12/25 12:00',
    );
  });

  it('says 00:00 at midnight, not 24:00', () => {
    expect(formatLocalTime(new Date(2026, 6, 31, 0, 0))).toBe(
      '2026/07/31 00:00',
    );
  });

  it('stays on the 24 hour clock after noon', () => {
    expect(formatLocalTime(new Date(2026, 6, 31, 23, 59))).toBe(
      '2026/07/31 23:59',
    );
  });
});
