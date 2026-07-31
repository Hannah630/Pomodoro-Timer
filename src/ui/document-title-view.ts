import type { TimerState } from '../models/timer.model';
import { formatCountdown } from '../utils/format';
import { formatDocumentTitle } from './labels';

export interface DocumentTitleView {
  render(state: TimerState): void;
}

/**
 * The countdown in the browser tab.
 *
 * The one place the timer can still be read once the page is behind something
 * else — which, with a focus timer, is most of the time it matters.
 *
 * Assigning to document.title is not free even when the string is identical:
 * the browser has a tab strip and a window title to keep in step. So the last
 * value written is remembered and compared, and since the tab only carries
 * minutes and seconds, that turns sixty writes a second into one.
 */
export function createDocumentTitleView(): DocumentTitleView {
  let written = document.title;

  return {
    render(state) {
      const next = formatDocumentTitle(
        state,
        formatCountdown(state.remainingMs).clock,
      );

      if (next !== written) {
        written = next;
        document.title = next;
      }
    },
  };
}
