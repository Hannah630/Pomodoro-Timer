import { describe, expect, it } from 'vitest';

import { formatCountdown } from './format';

describe('formatCountdown', () => {
  it('formats zero as a full stop', () => {
    expect(formatCountdown(0)).toEqual({ clock: '00:00', centiseconds: '00' });
  });

  it('starts a full focus session on the round number', () => {
    expect(formatCountdown(25 * 60_000)).toEqual({
      clock: '25:00',
      centiseconds: '00',
    });
  });

  it('pads single digit minutes and seconds', () => {
    expect(formatCountdown(5 * 60_000 + 9_000).clock).toBe('05:09');
  });

  it('keeps the clock and the fraction agreeing with each other', () => {
    // Rounding the two apart would show 25:00 next to 50.
    expect(formatCountdown(24 * 60_000 + 59_500)).toEqual({
      clock: '24:59',
      centiseconds: '50',
    });
  });

  it('rounds up at the hundredth, not at the second', () => {
    // A leftover millisecond becomes a hundredth, so the clock stays put
    // instead of jumping a whole second ahead of the time that is left.
    expect(formatCountdown(59_001)).toEqual({
      clock: '00:59',
      centiseconds: '01',
    });
    expect(formatCountdown(5)).toEqual({ clock: '00:00', centiseconds: '01' });
    expect(formatCountdown(1)).toEqual({ clock: '00:00', centiseconds: '01' });
  });

  it('carries a full hundred hundredths into the next second', () => {
    expect(formatCountdown(59_991)).toEqual({
      clock: '01:00',
      centiseconds: '00',
    });
  });

  it('clamps negative input to a full stop', () => {
    expect(formatCountdown(-5_000)).toEqual({
      clock: '00:00',
      centiseconds: '00',
    });
  });

  it('keeps counting minutes past an hour', () => {
    expect(formatCountdown(60 * 60_000).clock).toBe('60:00');
  });
});
