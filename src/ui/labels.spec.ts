import { describe, expect, it } from 'vitest';

import type {
  TimerMode,
  TimerState,
  TimerStatus,
} from '../models/timer.model';
import {
  formatModeLabel,
  formatNextHint,
  formatPrimaryAction,
} from './labels';

function state(
  mode: TimerMode,
  completedFocusCount: number,
  status: TimerStatus = 'idle',
): TimerState {
  return { mode, status, remainingMs: 0, completedFocusCount };
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

  it('numbers a break by the session it follows', () => {
    expect(formatModeLabel(state('shortBreak', 3), 4)).toBe('Short break · 3/4');
    expect(formatModeLabel(state('longBreak', 4), 4)).toBe('Long break · 4/4');
    expect(formatModeLabel(state('shortBreak', 5), 4)).toBe('Short break · 1/4');
    expect(formatModeLabel(state('longBreak', 8), 4)).toBe('Long break · 4/4');
  });

  it('leaves a break unnumbered when nothing has been finished yet', () => {
    expect(formatModeLabel(state('shortBreak', 0), 4)).toBe('Short break');
  });

  it('falls back to the plain name when the cycle length is invalid', () => {
    expect(formatModeLabel(state('focus', 2), 0)).toBe('Focus');
  });
});

describe('formatNextHint', () => {
  it('names what comes after this session', () => {
    expect(formatNextHint('shortBreak')).toBe('Next: short break');
    expect(formatNextHint('longBreak')).toBe('Next: long break');
    expect(formatNextHint('focus')).toBe('Next: focus');
  });
});

describe('formatPrimaryAction', () => {
  it('names the session it is about to start', () => {
    expect(formatPrimaryAction(state('focus', 0))).toBe('Start focus');
    expect(formatPrimaryAction(state('shortBreak', 1))).toBe(
      'Start short break',
    );
    expect(formatPrimaryAction(state('longBreak', 4))).toBe('Start long break');
  });

  it('offers to pause a running session and to resume a paused one', () => {
    expect(formatPrimaryAction(state('focus', 0, 'running'))).toBe('Pause');
    expect(formatPrimaryAction(state('focus', 0, 'paused'))).toBe('Resume');
  });
});
