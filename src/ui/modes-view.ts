import type { TimerMode, TimerState } from '../models/timer.model';
import { queryElement } from './dom';
import { MODE_LABELS } from './labels';

const MODE_BUTTONS: ReadonlyArray<{ selector: string; mode: TimerMode }> = [
  { selector: '[data-mode-focus]', mode: 'focus' },
  { selector: '[data-mode-break]', mode: 'break' },
];

export interface ModesHandlers {
  onSelect(mode: TimerMode): void;
}

export interface ModesView {
  render(state: TimerState): void;

  /** How many focus sessions have finished today. */
  setTodayCount(count: number): void;
}

/**
 * The mode switcher, which doubles as the label for the current mode.
 *
 * One element rather than two: a separate heading saying "Focus" beside a
 * control for choosing Focus would be the same word twice.
 */
export function createModesView(
  root: ParentNode,
  handlers: ModesHandlers,
): ModesView {
  const todayElement = queryElement(root, '[data-today]');

  const buttons = MODE_BUTTONS.map(({ selector, mode }) => {
    const button = queryElement<HTMLButtonElement>(root, selector);

    button.textContent = MODE_LABELS[mode];
    button.addEventListener('click', () => handlers.onSelect(mode));

    return { button, mode };
  });

  return {
    render(state) {
      buttons.forEach(({ button, mode }) => {
        const isActive = mode === state.mode;

        button.classList.toggle('mode--active', isActive);
        // aria-pressed rather than aria-current: these are toggle buttons that
        // change what the timer is doing, not links to somewhere else.
        button.setAttribute('aria-pressed', String(isActive));
      });
    },

    setTodayCount(count) {
      todayElement.textContent = `${count} today`;
    },
  };
}
