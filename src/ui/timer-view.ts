import type { TimerMode, TimerState } from '../models/timer.model';
import { formatTime } from '../utils/format';
import { queryElement } from './dom';
import { formatModeLabel } from './labels';

/** Each mode points the shared --mode token at its own accent. */
const MODE_ACCENTS: Record<TimerMode, string> = {
  focus: 'var(--mode-focus)',
  shortBreak: 'var(--mode-short-break)',
  longBreak: 'var(--mode-long-break)',
};

/** Must match the alert-wash animation in layout.css. */
const ALERT_DURATION_MS = 900;

export interface TimerView {
  render(
    state: TimerState,
    sessionDurationMs: number,
    roundsPerLongBreak: number,
  ): void;

  /**
   * A one-off wash of colour when a session ends. Always shown, so the app
   * still says something when notifications are blocked or muted.
   */
  flash(): void;
}

/**
 * Renders the mode label, the remaining time, and the page-wide progress
 * field. Contains no rules about time; it only displays what it is given.
 */
export function createTimerView(root: ParentNode): TimerView {
  const modeElement = queryElement(root, '[data-mode]');
  const timeElement = queryElement(root, '[data-time]');
  const documentRoot = document.documentElement;
  const theme = documentRoot.style;

  let alertTimeout: number | undefined;

  return {
    flash() {
      window.clearTimeout(alertTimeout);
      documentRoot.classList.remove('is-alerting');

      // Reading a layout property forces a reflow, so re-adding the class
      // restarts the animation instead of being coalesced into no change.
      void documentRoot.offsetWidth;

      documentRoot.classList.add('is-alerting');
      alertTimeout = window.setTimeout(() => {
        documentRoot.classList.remove('is-alerting');
      }, ALERT_DURATION_MS);
    },

    render(state, sessionDurationMs, roundsPerLongBreak) {
      const time = formatTime(state.remainingMs);

      // The timer ticks four times a second but the display only changes
      // once, so skip the write unless the text actually differs.
      if (timeElement.textContent !== time) {
        timeElement.textContent = time;
      }

      modeElement.textContent = formatModeLabel(state, roundsPerLongBreak);

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
