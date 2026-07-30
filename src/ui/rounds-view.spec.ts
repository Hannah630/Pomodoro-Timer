import { describe, expect, it } from 'vitest';

import { filledRounds, formatSessionCount } from './rounds-view';

describe('filledRounds', () => {
  it('starts a cycle empty', () => {
    expect(filledRounds('focus', 0, 4)).toBe(0);
  });

  it('fills one dot per finished focus session', () => {
    expect(filledRounds('focus', 1, 4)).toBe(1);
    expect(filledRounds('shortBreak', 2, 4)).toBe(2);
  });

  it('shows a full cycle during the long break that was just earned', () => {
    expect(filledRounds('longBreak', 4, 4)).toBe(4);
    expect(filledRounds('longBreak', 8, 4)).toBe(4);
  });

  it('wraps to a fresh cycle once focus starts again', () => {
    expect(filledRounds('focus', 4, 4)).toBe(0);
    expect(filledRounds('focus', 5, 4)).toBe(1);
  });

  it('returns nothing rather than NaN when the cycle length is invalid', () => {
    expect(filledRounds('focus', 3, 0)).toBe(0);
  });
});

describe('formatSessionCount', () => {
  it('uses the singular for exactly one session', () => {
    expect(formatSessionCount(1)).toBe('1 session');
  });

  it('uses the plural everywhere else', () => {
    expect(formatSessionCount(0)).toBe('0 sessions');
    expect(formatSessionCount(12)).toBe('12 sessions');
  });
});
