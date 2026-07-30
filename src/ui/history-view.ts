import type { SessionRecord } from '../models/session.model';
import { queryElement } from './dom';
import {
  formatClockTime,
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

export interface HistoryView {
  render(records: readonly SessionRecord[]): void;
}

/**
 * The history drawer.
 *
 * The list is rendered only when the history changes, never on a tick, so
 * rebuilding the whole thing is cheap enough to keep the code simple.
 *
 * Opening is a class on the root rather than a <details> element, because a
 * details body is display:none while closed and so has nothing to slide.
 */
export function createHistoryView(
  root: ParentNode,
  handlers: HistoryHandlers,
): HistoryView {
  const toggle = queryElement<HTMLButtonElement>(root, '[data-history-toggle]');
  const drawer = queryElement(root, '[data-history-drawer]');
  const scrim = queryElement(root, '[data-history-scrim]');
  const summary = queryElement(root, '[data-history-summary]');
  const list = queryElement(root, '[data-history]');
  const empty = queryElement(root, '[data-history-empty]');
  const clearButton = queryElement<HTMLButtonElement>(
    root,
    '[data-history-clear]',
  );

  let isOpen = false;
  let isConfirming = false;
  let confirmTimeout: number | undefined;

  function setOpen(open: boolean): void {
    isOpen = open;
    cancelConfirm();

    document.documentElement.classList.toggle('is-history-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'Close' : 'History';

    if (open) {
      // inert keeps the closed drawer out of the tab order, so focus cannot
      // land on a list that is off screen.
      drawer.removeAttribute('inert');
      drawer.focus();
    } else {
      drawer.setAttribute('inert', '');
      toggle.focus();
    }
  }

  function cancelConfirm(): void {
    window.clearTimeout(confirmTimeout);
    isConfirming = false;
    clearButton.textContent = 'Clear history';
    clearButton.classList.remove('history__clear--confirming');
  }

  toggle.addEventListener('click', () => setOpen(!isOpen));
  scrim.addEventListener('click', () => setOpen(false));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen) {
      setOpen(false);
    }
  });

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
    render(records) {
      const hasRecords = records.length > 0;
      const now = Date.now();

      summary.hidden = !hasRecords;
      empty.hidden = hasRecords;
      clearButton.hidden = !hasRecords;
      cancelConfirm();

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
  label.textContent = day.label;

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
