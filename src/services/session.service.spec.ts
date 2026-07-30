import { describe, expect, it } from 'vitest';

import {
  createSessionService,
  MAX_TITLE_LENGTH,
  normalizeTitle,
} from './session.service';

describe('normalizeTitle', () => {
  it('keeps a title that is already fine', () => {
    expect(normalizeTitle('Write Q3 report')).toBe('Write Q3 report');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeTitle('  Fix login bug  ')).toBe('Fix login bug');
  });

  it('treats a blank title as empty', () => {
    expect(normalizeTitle('   ')).toBe('');
  });

  it('keeps a title of exactly the maximum length', () => {
    const exact = 'a'.repeat(MAX_TITLE_LENGTH);

    expect(normalizeTitle(exact)).toBe(exact);
  });

  it('caps anything longer', () => {
    expect(normalizeTitle('a'.repeat(MAX_TITLE_LENGTH + 5))).toHaveLength(
      MAX_TITLE_LENGTH,
    );
  });

  it('counts a CJK character as one', () => {
    const twenty = '專'.repeat(MAX_TITLE_LENGTH);

    expect(normalizeTitle(twenty)).toBe(twenty);
  });

  it('does not cut an emoji in half at the limit', () => {
    const capped = normalizeTitle(`${'a'.repeat(MAX_TITLE_LENGTH - 1)}🍅🍅`);

    expect(capped.endsWith('🍅')).toBe(true);
    expect([...capped]).toHaveLength(MAX_TITLE_LENGTH);
  });
});

describe('session service', () => {
  it('starts without a title', () => {
    expect(createSessionService().getTitle()).toBe('');
  });

  it('stores the normalized title', () => {
    const session = createSessionService();

    session.setTitle('  Write Q3 report  ');

    expect(session.getTitle()).toBe('Write Q3 report');
  });
});
