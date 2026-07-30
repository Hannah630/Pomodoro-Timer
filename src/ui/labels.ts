import type { TimerMode } from '../models/timer.model';

/** The user-facing name of each mode, written once and shared by every view. */
export const MODE_LABELS: Record<TimerMode, string> = {
  focus: 'Focus',
  shortBreak: 'Short break',
  longBreak: 'Long break',
};
