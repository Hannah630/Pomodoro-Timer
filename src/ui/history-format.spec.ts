import { describe, expect, it } from 'vitest';

import type { SessionRecord } from '../models/session.model';
import {
  formatAllTimeSummary,
  formatClockTime,
  formatDayLabel,
  formatDayTotals,
  formatDuration,
  formatTodaySummary,
  formatTotalDuration,
  groupByDay,
  isSameDay,
  summarizeToday,
} from './history-format';

/** Built from local parts, since every check here works in local time. */
function at(
  year: number,
  month: number,
  day: number,
  hour = 12,
  minute = 0,
): number {
  return new Date(year, month - 1, day, hour, minute).getTime();
}

function record(finishedAt: number, durationMs = 1_500_000): SessionRecord {
  return { id: String(finishedAt), title: 'Task', durationMs, finishedAt };
}

describe('isSameDay', () => {
  it('is true for two times on the same date', () => {
    expect(isSameDay(at(2026, 7, 30, 9, 5), at(2026, 7, 30, 23, 59))).toBe(
      true,
    );
  });

  it('is false across midnight', () => {
    expect(isSameDay(at(2026, 7, 30, 23, 59), at(2026, 7, 31, 0, 1))).toBe(
      false,
    );
  });

  it('is false for the same date in a different month or year', () => {
    expect(isSameDay(at(2026, 6, 30), at(2026, 7, 30))).toBe(false);
    expect(isSameDay(at(2025, 7, 30), at(2026, 7, 30))).toBe(false);
  });
});

describe('formatClockTime', () => {
  it('uses a zero-padded 24 hour clock', () => {
    expect(formatClockTime(at(2026, 7, 30, 9, 5))).toBe('09:05');
    expect(formatClockTime(at(2026, 7, 30, 23, 59))).toBe('23:59');
    expect(formatClockTime(at(2026, 7, 30, 0, 0))).toBe('00:00');
  });
});

describe('formatDuration', () => {
  it('reports whole minutes', () => {
    expect(formatDuration(1_500_000)).toBe('25 min');
    expect(formatDuration(60_000)).toBe('1 min');
  });
});

describe('formatDayLabel', () => {
  const now = at(2026, 7, 30, 15, 0);

  it('names today and yesterday', () => {
    expect(formatDayLabel(at(2026, 7, 30, 9, 0), now)).toBe('Today');
    expect(formatDayLabel(at(2026, 7, 29, 9, 0), now)).toBe('Yesterday');
  });

  it('crosses a month boundary into yesterday', () => {
    expect(formatDayLabel(at(2026, 6, 30), at(2026, 7, 1, 10, 0))).toBe(
      'Yesterday',
    );
  });

  it('dates anything older in English, whatever the browser language', () => {
    expect(formatDayLabel(at(2026, 7, 28), now)).toBe('Jul 28');
    expect(formatDayLabel(at(2026, 1, 3), now)).toBe('Jan 3');
  });

  it('adds the year once it differs from the current one', () => {
    expect(formatDayLabel(at(2025, 12, 24), now)).toBe('Dec 24, 2025');
  });
});

describe('groupByDay', () => {
  const now = at(2026, 7, 30, 15, 0);

  it('returns nothing for an empty history', () => {
    expect(groupByDay([], now)).toEqual([]);
  });

  it('collects consecutive records of the same day under one label', () => {
    const days = groupByDay(
      [
        record(at(2026, 7, 30, 14, 32)),
        record(at(2026, 7, 30, 13, 58)),
        record(at(2026, 7, 29, 9, 10)),
      ],
      now,
    );

    expect(days.map((day) => day.label)).toEqual(['Today', 'Yesterday']);
    expect(days[0]?.records).toHaveLength(2);
    expect(days[1]?.records).toHaveLength(1);
  });

  it('keeps the order it was given', () => {
    const newest = record(at(2026, 7, 30, 14, 32));
    const older = record(at(2026, 7, 30, 13, 58));

    const days = groupByDay([newest, older], now);

    expect(days[0]?.records).toEqual([newest, older]);
  });
});

describe('summarizeToday', () => {
  const now = at(2026, 7, 30, 15, 0);

  it('counts nothing when the history is empty', () => {
    expect(summarizeToday([], now)).toEqual({ sessions: 0, minutes: 0 });
  });

  it('adds up only today', () => {
    const summary = summarizeToday(
      [
        record(at(2026, 7, 30, 14, 32), 1_500_000),
        record(at(2026, 7, 30, 13, 58), 1_500_000),
        record(at(2026, 7, 29, 9, 10), 1_500_000),
      ],
      now,
    );

    expect(summary).toEqual({ sessions: 2, minutes: 50 });
  });
});

describe('formatTotalDuration', () => {
  it('stays in minutes below an hour', () => {
    expect(formatTotalDuration(45 * 60_000)).toBe('45 min');
    expect(formatTotalDuration(0)).toBe('0 min');
  });

  it('switches to hours at an hour', () => {
    expect(formatTotalDuration(60 * 60_000)).toBe('1 h');
    expect(formatTotalDuration(53 * 60 * 60_000)).toBe('53 h');
  });

  it('carries the remaining minutes when there are any', () => {
    expect(formatTotalDuration((53 * 60 + 20) * 60_000)).toBe('53 h 20 min');
  });
});

describe('formatAllTimeSummary', () => {
  it('reads as a lifetime line', () => {
    expect(formatAllTimeSummary(128, (53 * 60 + 20) * 60_000)).toBe(
      'All time · 128 sessions · 53 h 20 min',
    );
  });

  it('uses the singular for a single session', () => {
    expect(formatAllTimeSummary(1, 25 * 60_000)).toBe(
      'All time · 1 session · 25 min',
    );
  });
});

describe('formatDayTotals', () => {
  it('counts the entries and their minutes', () => {
    expect(
      formatDayTotals([
        record(at(2026, 7, 30, 14, 32), 1_500_000),
        record(at(2026, 7, 30, 13, 58), 600_000),
      ]),
    ).toBe('2 · 35 min');
  });
});

describe('formatTodaySummary', () => {
  it('uses the singular for a single session', () => {
    expect(formatTodaySummary({ sessions: 1, minutes: 25 })).toBe(
      '1 session · 25 min today',
    );
  });

  it('uses the plural everywhere else', () => {
    expect(formatTodaySummary({ sessions: 0, minutes: 0 })).toBe(
      '0 sessions · 0 min today',
    );
    expect(formatTodaySummary({ sessions: 4, minutes: 100 })).toBe(
      '4 sessions · 100 min today',
    );
  });
});
