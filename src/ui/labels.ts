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
