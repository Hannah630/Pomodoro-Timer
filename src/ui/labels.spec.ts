import { describe, expect, it } from 'vitest';

import type { TimerMode, TimerState } from '../models/timer.model';
import { formatModeLabel } from './labels';

function state(mode: TimerMode, completedFocusCount: number): TimerState {
  return { mode, status: 'idle', remainingMs: 0, completedFocusCount };
}

describe('formatModeLabel', () => {
  it('numbers the first focus session of a cycle', () => {
    expect(formatModeLabel(state('focus', 0), 4)).toBe('Focus · 1/4');
  });

  it('counts up through the cycle', () => {
    expect(formatModeLabel(state('focus', 2), 4)).toBe('Focus · 3/4');
    expect(formatModeLabel(state('focus', 3), 4)).toBe('Focus · 4/4');
  });

  it('wraps to the start of the next cycle', () => {
    expect(formatModeLabel(state('focus', 4), 4)).toBe('Focus · 1/4');
    expect(formatModeLabel(state('focus', 9), 4)).toBe('Focus · 2/4');
  });

  it('leaves breaks unnumbered', () => {
    expect(formatModeLabel(state('shortBreak', 2), 4)).toBe('Short break');
    expect(formatModeLabel(state('longBreak', 4), 4)).toBe('Long break');
  });

  it('falls back to the plain name when the cycle length is invalid', () => {
    expect(formatModeLabel(state('focus', 2), 0)).toBe('Focus');
  });
});
