import type { TimerMode, TimerState } from '../models/timer.model';
import { formatTime } from '../utils/format';
import { queryElement } from './dom';

const MODE_LABELS: Record<TimerMode, string> = {
  focus: 'Focus',
  shortBreak: 'Short break',
  longBreak: 'Long break',
};

/** Each mode points the shared --mode token at its own accent. */
const MODE_ACCENTS: Record<TimerMode, string> = {
  focus: 'var(--mode-focus)',
  shortBreak: 'var(--mode-short-break)',
  longBreak: 'var(--mode-long-break)',
};

export interface TimerView {
  render(state: TimerState, sessionDurationMs: number): void;
}

/**
 * Renders the mode label, the remaining time, and the page-wide progress
 * field. Contains no rules about time; it only displays what it is given.
 */
export function createTimerView(root: ParentNode): TimerView {
  const modeElement = queryElement(root, '[data-mode]');
  const timeElement = queryElement(root, '[data-time]');
  const theme = document.documentElement.style;

  return {
    render(state, sessionDurationMs) {
      const time = formatTime(state.remainingMs);

      // The timer ticks four times a second but the display only changes
      // once, so skip the write unless the text actually differs.
      if (timeElement.textContent !== time) {
        timeElement.textContent = time;
      }

      modeElement.textContent = MODE_LABELS[state.mode];

      theme.setProperty('--mode', MODE_ACCENTS[state.mode]);
      theme.setProperty('--fill', String(fillOf(state.remainingMs, sessionDurationMs)));
    },
  };
}

/** How much of the session is left, as a 0-1 fraction for CSS. */
function fillOf(remainingMs: number, sessionDurationMs: number): number {
  if (sessionDurationMs <= 0) {
    return 0;
  }

  return Math.min(1, Math.max(0, remainingMs / sessionDurationMs));
}
