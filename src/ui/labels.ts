import type { TimerMode, TimerState } from '../models/timer.model';

/** The user-facing name of each mode, written once and shared by every view. */
export const MODE_LABELS: Record<TimerMode, string> = {
  focus: 'Focus',
  shortBreak: 'Short break',
  longBreak: 'Long break',
};

/**
 * The mode, and for a focus session where it falls in the cycle.
 *
 * Folding the position into the label keeps "how far to the long break"
 * on screen without spending a row on it. Breaks are not numbered: the
 * question only makes sense about focus sessions.
 */
export function formatModeLabel(
  state: TimerState,
  roundsPerLongBreak: number,
): string {
  const name = MODE_LABELS[state.mode];

  if (state.mode !== 'focus' || roundsPerLongBreak < 1) {
    return name;
  }

  const position = (state.completedFocusCount % roundsPerLongBreak) + 1;

  return `${name} · ${position}/${roundsPerLongBreak}`;
}
