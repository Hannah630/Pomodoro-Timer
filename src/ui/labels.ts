import type { TimerMode, TimerState } from '../models/timer.model';

/** The user-facing name of each mode, written once and shared by every view. */
export const MODE_LABELS: Record<TimerMode, string> = {
  focus: 'Focus',
  shortBreak: 'Short break',
  longBreak: 'Long break',
};

/**
 * The mode, and where it falls in the cycle.
 *
 * Breaks are numbered too. Losing the count during a break was the point at
 * which "how far to the long one" stopped being answerable, which is most of
 * why the cycle felt opaque.
 *
 * A focus session is numbered by itself — the one about to run — and a break
 * by the focus session it follows.
 */
export function formatModeLabel(
  state: TimerState,
  roundsPerLongBreak: number,
): string {
  const name = MODE_LABELS[state.mode];

  if (roundsPerLongBreak < 1) {
    return name;
  }

  if (state.mode === 'focus') {
    const position = (state.completedFocusCount % roundsPerLongBreak) + 1;
    return `${name} · ${position}/${roundsPerLongBreak}`;
  }

  // A break always follows a finished session, so this cannot be zero in
  // practice; guarding keeps a restored count of zero from reading as 0/4.
  if (state.completedFocusCount < 1) {
    return name;
  }

  const position = ((state.completedFocusCount - 1) % roundsPerLongBreak) + 1;

  return `${name} · ${position}/${roundsPerLongBreak}`;
}

/** Says what the current session leads to, while it is still running. */
export function formatNextHint(nextMode: TimerMode): string {
  return `Next: ${MODE_LABELS[nextMode].toLowerCase()}`;
}

/**
 * What the primary button does right now.
 *
 * Naming the session it is about to start is the other half of making the
 * transition legible: the timer stops between sessions, and a button reading
 * only "Start" gave no sign of what was waiting.
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
