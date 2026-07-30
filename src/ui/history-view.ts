import type { SessionRecord } from '../models/session.model';
import { MS_PER_MINUTE } from '../models/timer.model';
import { queryElement } from './dom';

const TIME_FORMAT = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const DATE_TIME_FORMAT = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export interface HistoryHandlers {
  onClear(): void;
}

export interface HistoryView {
  render(records: readonly SessionRecord[]): void;
}

/**
 * The list of finished sessions.
 *
 * Rendered only when the history changes, never on a tick, so rebuilding the
 * whole list is cheap enough to keep the code simple.
 */
export function createHistoryView(
  root: ParentNode,
  handlers: HistoryHandlers,
): HistoryView {
  const list = queryElement(root, '[data-history]');
  const empty = queryElement(root, '[data-history-empty]');
  const clearButton = queryElement<HTMLButtonElement>(
    root,
    '[data-history-clear]',
  );

  clearButton.addEventListener('click', () => {
    // Clearing cannot be undone, so make the user say it twice.
    if (window.confirm('Clear all history? This cannot be undone.')) {
      handlers.onClear();
    }
  });

  return {
    render(records) {
      const hasRecords = records.length > 0;

      empty.hidden = hasRecords;
      clearButton.hidden = !hasRecords;

      list.replaceChildren(
        ...records.map((record) => buildRow(record, Date.now())),
      );
    },
  };
}

function buildRow(record: SessionRecord, now: number): HTMLElement {
  const row = document.createElement('li');
  row.className = 'history__item';

  const title = document.createElement('span');
  title.className = 'history__title';
  title.textContent = record.title || 'Untitled';
  if (!record.title) {
    title.classList.add('history__title--untitled');
  }

  const meta = document.createElement('span');
  meta.className = 'history__meta';
  meta.textContent = `${formatDuration(record.durationMs)} · ${formatFinishedAt(
    record.finishedAt,
    now,
  )}`;

  row.append(title, meta);

  return row;
}

function formatDuration(durationMs: number): string {
  return `${Math.round(durationMs / MS_PER_MINUTE)} min`;
}

/** Today only needs the time; anything older needs the date to make sense. */
function formatFinishedAt(finishedAt: number, now: number): string {
  const format = isSameDay(finishedAt, now) ? TIME_FORMAT : DATE_TIME_FORMAT;

  return format.format(new Date(finishedAt));
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
