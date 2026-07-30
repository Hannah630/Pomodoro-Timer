import { describe, expect, it } from 'vitest';

import { parseMinutes } from './settings-view';

describe('parseMinutes', () => {
  it('reads a plain number', () => {
    expect(parseMinutes('25')).toBe(25);
  });

  it('ignores surrounding whitespace', () => {
    expect(parseMinutes('  10 ')).toBe(10);
  });

  it('returns null for an empty field', () => {
    expect(parseMinutes('')).toBeNull();
    expect(parseMinutes('   ')).toBeNull();
  });

  it('returns null for text that is not a number', () => {
    expect(parseMinutes('abc')).toBeNull();
    expect(parseMinutes('12abc')).toBeNull();
  });

  it('passes out-of-range numbers through for the service to clamp', () => {
    expect(parseMinutes('0')).toBe(0);
    expect(parseMinutes('-5')).toBe(-5);
    expect(parseMinutes('999')).toBe(999);
  });
});
