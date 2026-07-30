import type { SessionRecord } from '../models/session.model';
import { MS_PER_MINUTE } from '../models/timer.model';

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export interface HistoryDay {
  readonly label: string;
  readonly records: readonly SessionRecord[];
}

export interface TodaySummary {
  readonly sessions: number;
  readonly minutes: number;
}

/**
 * Dates are formatted by hand rather than through Intl.
 *
 * Intl follows the browser's language, so the same build would read "Jul 29"
 * for one reader and a translated form for the next. The interface is in
 * English throughout, and a hand-rolled format is also one a spec can assert
 * on without pinning the test runner's locale.
 */
export function formatClockTime(timestamp: number): string {
  const date = new Date(timestamp);

  return `${padTwoDigits(date.getHours())}:${padTwoDigits(date.getMinutes())}`;
}

export function formatDuration(durationMs: number): string {
  return `${Math.round(durationMs / MS_PER_MINUTE)} min`;
}

/** The two most recent days get names; older ones need the date to place them. */
export function formatDayLabel(timestamp: number, now: number): string {
  if (isSameDay(timestamp, now)) {
    return 'Today';
  }

  if (isSameDay(timestamp, previousDay(now))) {
    return 'Yesterday';
  }

  const date = new Date(timestamp);
  const month = MONTHS[date.getMonth()] ?? '';
  const label = `${month} ${date.getDate()}`;

  return date.getFullYear() === new Date(now).getFullYear()
    ? label
    : `${label}, ${date.getFullYear()}`;
}

/**
 * Splits the list into consecutive runs sharing a day.
 *
 * Records arrive newest first, so comparing each one with the run being built
 * is enough; there is no need to sort or to index by date.
 */
export function groupByDay(
  records: readonly SessionRecord[],
  now: number,
): HistoryDay[] {
  const days: Array<{ label: string; records: SessionRecord[] }> = [];

  for (const record of records) {
    const label = formatDayLabel(record.finishedAt, now);
    const currentDay = days.at(-1);

    if (currentDay && currentDay.label === label) {
      currentDay.records.push(record);
    } else {
      days.push({ label, records: [record] });
    }
  }

  return days;
}

export function summarizeToday(
  records: readonly SessionRecord[],
  now: number,
): TodaySummary {
  const today = records.filter((record) => isSameDay(record.finishedAt, now));
  const totalMs = today.reduce((sum, record) => sum + record.durationMs, 0);

  return {
    sessions: today.length,
    minutes: Math.round(totalMs / MS_PER_MINUTE),
  };
}

export function formatTodaySummary(summary: TodaySummary): string {
  const unit = summary.sessions === 1 ? 'session' : 'sessions';

  return `${summary.sessions} ${unit} · ${summary.minutes} min today`;
}

export function isSameDay(a: number, b: number): boolean {
  const first = new Date(a);
  const second = new Date(b);

  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

/**
 * Stepping the calendar date back, rather than subtracting 24 hours, so the
 * clocks changing does not turn yesterday into the day before.
 */
function previousDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setDate(date.getDate() - 1);

  return date.getTime();
}

function padTwoDigits(value: number): string {
  return value.toString().padStart(2, '0');
}
