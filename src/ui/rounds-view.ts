import type { TimerMode, TimerState } from '../models/timer.model';
import { queryElement } from './dom';

export interface RoundsView {
  render(state: TimerState, roundsPerLongBreak: number): void;
}

/**
 * Shows how far through the current cycle the user is, and how many focus
 * sessions they have finished in total.
 */
export function createRoundsView(root: ParentNode): RoundsView {
  const dotsElement = queryElement(root, '[data-dots]');
  const countElement = queryElement(root, '[data-count]');

  let dots: HTMLElement[] = [];

  return {
    render(state, roundsPerLongBreak) {
      if (dots.length !== roundsPerLongBreak) {
        dots = buildDots(dotsElement, roundsPerLongBreak);
      }

      const filled = filledRounds(
        state.mode,
        state.completedFocusCount,
        roundsPerLongBreak,
      );

      dots.forEach((dot, index) => {
        dot.classList.toggle('rounds__dot--done', index < filled);
      });

      countElement.textContent = formatSessionCount(state.completedFocusCount);
    },
  };
}

/**
 * How many dots to fill for the cycle in progress.
 *
 * A finished fourth session leaves the count on a multiple of the cycle
 * length, which would otherwise read as an empty cycle at the very moment the
 * user earned the long break. So the long break shows a full cycle, and the
 * count only wraps once focus starts again.
 */
export function filledRounds(
  mode: TimerMode,
  completedFocusCount: number,
  roundsPerLongBreak: number,
): number {
  if (roundsPerLongBreak <= 0) {
    return 0;
  }

  if (mode === 'longBreak') {
    return roundsPerLongBreak;
  }

  return completedFocusCount % roundsPerLongBreak;
}

export function formatSessionCount(completedFocusCount: number): string {
  const unit = completedFocusCount === 1 ? 'session' : 'sessions';

  return `${completedFocusCount} ${unit}`;
}

function buildDots(container: HTMLElement, total: number): HTMLElement[] {
  container.replaceChildren();

  return Array.from({ length: total }, () => {
    const dot = document.createElement('span');
    dot.className = 'rounds__dot';
    container.append(dot);

    return dot;
  });
}
