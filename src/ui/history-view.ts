import type { SessionRecord } from '../models/session.model';
import { queryElement } from './dom';
import {
  formatAllTimeSummary,
  formatClockTime,
  formatDayTotals,
  formatDuration,
  formatTodaySummary,
  groupByDay,
  summarizeToday,
  type HistoryDay,
} from './history-format';

/** How long the clear button waits for the second press before giving up. */
const CONFIRM_TIMEOUT_MS = 4_000;

export interface HistoryHandlers {
  onClear(): void;
}

export interface AllTimeTotals {
  readonly sessions: number;
  readonly focusMs: number;
}

export interface HistoryView {
  render(records: readonly SessionRecord[], allTime: AllTimeTotals): void;

  /** Drops a half-finished clear, so the drawer never reopens mid-question. */
  resetConfirm(): void;
}

/**
 * The contents of the history drawer.
 *
 * The list is rendered only when the history changes, never on a tick, so
 * rebuilding the whole thing is cheap enough to keep the code simple. Opening
 * and closing belongs to the drawer group, not here.
 */
export function createHistoryView(
  root: ParentNode,
  handlers: HistoryHandlers,
): HistoryView {
  const summary = queryElement(root, '[data-history-summary]');
  const lifetime = queryElement(root, '[data-history-lifetime]');
  const list = queryElement(root, '[data-history]');
  const empty = queryElement(root, '[data-history-empty]');
  const clearButton = queryElement<HTMLButtonElement>(
    root,
    '[data-history-clear]',
  );

  let isConfirming = false;
  let confirmTimeout: number | undefined;

  function cancelConfirm(): void {
    window.clearTimeout(confirmTimeout);
    isConfirming = false;
    clearButton.textContent = 'Clear history';
    clearButton.classList.remove('history__clear--confirming');
  }

  clearButton.addEventListener('click', () => {
    // Clearing cannot be undone, so ask twice. A second press on the button
    // itself keeps the answer where the question was asked, which a native
    // confirm dialog cannot do — and its buttons are in the browser's
    // language, not the interface's.
    if (!isConfirming) {
      isConfirming = true;
      clearButton.textContent = 'Confirm clear';
      clearButton.classList.add('history__clear--confirming');
      confirmTimeout = window.setTimeout(cancelConfirm, CONFIRM_TIMEOUT_MS);
      return;
    }

    cancelConfirm();
    handlers.onClear();
  });

  return {
    resetConfirm: cancelConfirm,

    render(records, allTime) {
      const hasRecords = records.length > 0;
      const now = Date.now();

      summary.hidden = !hasRecords;
      empty.hidden = hasRecords;
      clearButton.hidden = !hasRecords;
      cancelConfirm();

      // The lifetime line stays even with an empty list, since clearing the
      // history does not undo the work it recorded.
      lifetime.hidden = allTime.sessions === 0;
      lifetime.textContent = formatAllTimeSummary(
        allTime.sessions,
        allTime.focusMs,
      );

      summary.textContent = formatTodaySummary(summarizeToday(records, now));
      list.replaceChildren(
        ...groupByDay(records, now).map((day) => buildDay(day)),
      );
    },
  };
}

function buildDay(day: HistoryDay): HTMLElement {
  const section = document.createElement('li');
  section.className = 'history__day';

  const label = document.createElement('h3');
  label.className = 'history__day-label';

  const name = document.createElement('span');
  name.textContent = day.label;

  const totals = document.createElement('span');
  totals.className = 'history__day-totals';
  totals.textContent = formatDayTotals(day.records);

  label.append(name, totals);

  const rows = document.createElement('ul');
  rows.className = 'history__rows';
  rows.append(...day.records.map((record) => buildRow(record)));

  section.append(label, rows);

  return section;
}

function buildRow(record: SessionRecord): HTMLElement {
  const row = document.createElement('li');
  row.className = 'history__item';

  const title = document.createElement('span');
  title.className = 'history__title';
  title.textContent = record.title || 'Untitled';
  if (!record.title) {
    title.classList.add('history__title--untitled');
  }

  const duration = document.createElement('span');
  duration.className = 'history__duration';
  duration.textContent = formatDuration(record.durationMs);

  const time = document.createElement('span');
  time.className = 'history__time';
  time.textContent = formatClockTime(record.finishedAt);

  row.append(title, duration, time);

  return row;
}
