import type { TimerMode, TimerState } from '../models/timer.model';

/** The user-facing name of each mode, written once and shared by every view. */
export const MODE_LABELS: Record<TimerMode, string> = {
  focus: 'Focus',
  break: 'Break',
};

/**
 * What the primary button does right now.
 *
 * Naming the session it is about to start is what makes the transition
 * legible: the timer stops between sessions, and a button reading only
 * "Start" gave no sign of what was waiting.
 */
export function formatPrimaryAction(state: TimerState): string {
  switch (state.status) {
    case 'running':
      return 'Pause';
    case 'paused':
      return 'Resume';
    case 'idle':
      return `Start ${MODE_LABELS[state.mode].toLowerCase()}`;
  }
}

/**
 * What a finished session is called, in two parts.
 *
 * One source for the desktop notification and for the announcement a screen
 * reader hears. They are the same sentence said down two channels, and two
 * copies would be two chances to describe the same event differently.
 */
export function formatCompletion(
  finished: TimerMode,
  next: TimerMode,
): { readonly headline: string; readonly detail: string } {
  return {
    headline: `${MODE_LABELS[finished]} finished`,
    detail: `Up next: ${MODE_LABELS[next].toLowerCase()}`,
  };
}

/** The tab's title with nothing running, and what index.html already says. */
export const DOCUMENT_TITLE = 'Pomodoro Timer';

/**
 * What the browser tab reads.
 *
 * Only a running timer puts the countdown up there. A paused one showing
 * "12:34" in a tab the user is not looking at would say the session is still
 * going when it stopped the moment they left, which is the opposite of what
 * the focus guard just told them.
 *
 * Minutes and seconds only — the tab is glanced at, not watched, and
 * hundredths there would be a title that changes sixty times a second.
 */
export function formatDocumentTitle(state: TimerState, clock: string): string {
  if (state.status !== 'running') {
    return DOCUMENT_TITLE;
  }

  return `${clock} · ${MODE_LABELS[state.mode]}`;
}
