import { describe, expect, it } from 'vitest';

import { parseCount } from './settings-view';

describe('parseCount', () => {
  it('reads a plain number', () => {
    expect(parseCount('25')).toBe(25);
  });

  it('ignores surrounding whitespace', () => {
    expect(parseCount('  10 ')).toBe(10);
  });

  it('returns null for an empty field', () => {
    expect(parseCount('')).toBeNull();
    expect(parseCount('   ')).toBeNull();
  });

  it('returns null for text that is not a number', () => {
    expect(parseCount('abc')).toBeNull();
    expect(parseCount('12abc')).toBeNull();
  });

  it('passes out-of-range numbers through for the service to clamp', () => {
    expect(parseCount('0')).toBe(0);
    expect(parseCount('-5')).toBe(-5);
    expect(parseCount('999')).toBe(999);
  });
});
