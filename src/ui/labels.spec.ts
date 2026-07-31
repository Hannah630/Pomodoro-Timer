import { describe, expect, it } from 'vitest';

import type { TimerMode, TimerState, TimerStatus } from '../models/timer.model';
import { formatPrimaryAction } from './labels';

function state(mode: TimerMode, status: TimerStatus): TimerState {
  return { mode, status, remainingMs: 0, completedFocusCount: 0 };
}

describe('formatPrimaryAction', () => {
  it('names the session it is about to start', () => {
    expect(formatPrimaryAction(state('focus', 'idle'))).toBe('Start focus');
    expect(formatPrimaryAction(state('break', 'idle'))).toBe('Start break');
  });

  it('offers to pause a running session and to resume a paused one', () => {
    expect(formatPrimaryAction(state('focus', 'running'))).toBe('Pause');
    expect(formatPrimaryAction(state('focus', 'paused'))).toBe('Resume');
  });
});
