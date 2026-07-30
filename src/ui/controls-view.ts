import type { TimerState, TimerStatus } from '../models/timer.model';
import { queryElement } from './dom';
import { formatPrimaryAction } from './labels';

export interface ControlsHandlers {
  onStart(): void;
  onPause(): void;
  onReset(): void;
}

export interface ControlsView {
  render(state: TimerState): void;
}

/**
 * Wires the buttons to the handlers and keeps their labels in step with the
 * timer. Decides nothing about time itself.
 */
export function createControlsView(
  root: ParentNode,
  handlers: ControlsHandlers,
): ControlsView {
  const primaryButton = queryElement<HTMLButtonElement>(root, '[data-primary]');
  const resetButton = queryElement<HTMLButtonElement>(root, '[data-reset]');

  let status: TimerStatus = 'idle';

  primaryButton.addEventListener('click', () => {
    if (status === 'running') {
      handlers.onPause();
    } else {
      handlers.onStart();
    }
  });

  resetButton.addEventListener('click', () => {
    handlers.onReset();
  });

  return {
    render(state) {
      status = state.status;

      const label = formatPrimaryAction(state);
      if (primaryButton.textContent !== label) {
        primaryButton.textContent = label;
      }
    },
  };
}
