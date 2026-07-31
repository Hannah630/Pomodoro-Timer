import { describe, expect, it } from 'vitest';

import type { TimerMode, TimerState, TimerStatus } from '../models/timer.model';
import {
  DOCUMENT_TITLE,
  formatDocumentTitle,
  formatPrimaryAction,
} from './labels';

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

describe('formatDocumentTitle', () => {
  it('shows the countdown and the mode while running', () => {
    expect(formatDocumentTitle(state('focus', 'running'), '24:37')).toBe(
      '24:37 · Focus',
    );
    expect(formatDocumentTitle(state('break', 'running'), '04:12')).toBe(
      '04:12 · Break',
    );
  });

  // A tab reading 12:34 while the session is stopped would claim it is still
  // counting — and the focus guard stops sessions precisely when the user is
  // not looking at the tab.
  it('drops back to the plain name whenever nothing is counting', () => {
    expect(formatDocumentTitle(state('focus', 'idle'), '25:00')).toBe(
      DOCUMENT_TITLE,
    );
    expect(formatDocumentTitle(state('focus', 'paused'), '12:34')).toBe(
      DOCUMENT_TITLE,
    );
  });
});
