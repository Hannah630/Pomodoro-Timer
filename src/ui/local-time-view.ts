import { padTwoDigits } from '../utils/format';
import { queryElement } from './dom';

export interface LocalTimeView {
  /** Writes the current wall clock reading, if it has moved. */
  render(): void;
}

/**
 * The date and time of day, "2026/07/31 14:32".
 *
 * Built by hand rather than with toLocaleString, because this interface is
 * English wherever the browser happens to be set: a machine configured for
 * Chinese would otherwise put 2026年7月31日 下午2:32 above a page where every
 * other word is English. Building it also fixes the field order — the same
 * call would write 07/31/2026 in one place and 31/07/2026 in another, and a
 * date whose meaning depends on the reader's machine is worse than no date.
 *
 * One space between the two halves, not the middle dot the weather line uses:
 * that separates four unrelated facts, while this is a single reading.
 *
 * 24 hour, matching the countdown below it, and no seconds. A second hand
 * ticking above a timer is movement that carries no information, on a screen
 * whose whole argument is that the moving number is the one that matters.
 */
export function formatLocalTime(date: Date): string {
  const day = [
    date.getFullYear(),
    // Months count from zero, days from one.
    padTwoDigits(date.getMonth() + 1),
    padTwoDigits(date.getDate()),
  ].join('/');

  return `${day} ${padTwoDigits(date.getHours())}:${padTwoDigits(date.getMinutes())}`;
}

/**
 * The time of day, above the weather.
 *
 * The clock the user is actually in — the browser's — not the one the forecast
 * came back with. They agree in every ordinary case, and when they disagree it
 * is the device that is wrong about where it is, which is not something a
 * pomodoro timer should be quietly correcting.
 *
 * The last value written is remembered and compared, like the tab title: this
 * is asked a hundred times for every time it has anything new to say.
 */
export function createLocalTimeView(
  root: ParentNode,
  now: () => number = () => Date.now(),
): LocalTimeView {
  const line = queryElement(root, '[data-local-time]');
  let written: string | null = null;

  return {
    render() {
      const next = formatLocalTime(new Date(now()));

      if (next !== written) {
        written = next;
        line.textContent = next;
      }
    },
  };
}
