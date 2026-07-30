import { describe, expect, it } from 'vitest';

import { formatTime } from './format';

describe('formatTime', () => {
  it('formats zero as 00:00', () => {
    expect(formatTime(0)).toBe('00:00');
  });

  it('formats a full focus session', () => {
    expect(formatTime(25 * 60_000)).toBe('25:00');
  });

  it('pads single digit minutes and seconds', () => {
    expect(formatTime(5 * 60_000 + 9_000)).toBe('05:09');
  });

  it('rounds seconds up so the display never skips the starting value', () => {
    expect(formatTime(59_001)).toBe('01:00');
    expect(formatTime(1_000)).toBe('00:01');
    expect(formatTime(1)).toBe('00:01');
  });

  it('clamps negative input to 00:00', () => {
    expect(formatTime(-5_000)).toBe('00:00');
  });

  it('keeps counting minutes past an hour', () => {
    expect(formatTime(60 * 60_000)).toBe('60:00');
  });
});
