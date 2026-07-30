import type { TimerMode, TimerState } from '../models/timer.model';
import { formatCountdown } from '../utils/format';
import { queryElement } from './dom';
import { formatModeLabel, formatNextHint } from './labels';

/** Each mode points the shared --mode token at its own accent. */
const MODE_ACCENTS: Record<TimerMode, string> = {
  focus: 'var(--mode-focus)',
  shortBreak: 'var(--mode-short-break)',
  longBreak: 'var(--mode-long-break)',
};

/** Must match the alert-wash animation in layout.css. */
const ALERT_DURATION_MS = 900;

export interface TimerViewContext {
  readonly sessionDurationMs: number;
  readonly roundsPerLongBreak: number;
  readonly nextMode: TimerMode;
}

export interface TimerView {
  render(state: TimerState, context: TimerViewContext): void;

  /**
   * A one-off wash of colour when a session ends. Always shown, so the app
   * still says something when notifications are blocked or muted.
   */
  flash(): void;
}

/**
 * Renders the mode, the remaining time and the page-wide progress field.
 * Contains no rules about time; it only displays what it is given.
 */
export function createTimerView(root: ParentNode): TimerView {
  const modeElement = queryElement(root, '[data-mode]');
  const clockElement = queryElement(root, '[data-clock]');
  const centisecondsElement = queryElement(root, '[data-centiseconds]');
  const nextElement = queryElement(root, '[data-next]');
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

    render(state, context) {
      const countdown = formatCountdown(state.remainingMs);

      // The hundredths change on every frame; the clock changes once a second.
      // Splitting them keeps the repaint on the small text most of the time.
      centisecondsElement.textContent = countdown.centiseconds;

      if (clockElement.textContent !== countdown.clock) {
        clockElement.textContent = countdown.clock;
      }

      const mode = formatModeLabel(state, context.roundsPerLongBreak);
      if (modeElement.textContent !== mode) {
        modeElement.textContent = mode;
      }

      // Only a focus session leads somewhere worth announcing; a break always
      // leads back to focus.
      nextElement.hidden = state.mode !== 'focus';
      const hint = formatNextHint(context.nextMode);
      if (nextElement.textContent !== hint) {
        nextElement.textContent = hint;
      }

      theme.setProperty('--mode', MODE_ACCENTS[state.mode]);
      theme.setProperty(
        '--fill',
        String(fillOf(state.remainingMs, context.sessionDurationMs)),
      );
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
