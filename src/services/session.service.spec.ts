import { describe, expect, it } from 'vitest';

import {
  MAX_HISTORY_RECORDS,
  type SessionRecord,
} from '../models/session.model';
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

  it('restores a title it is given', () => {
    expect(createSessionService({ title: 'Fix login bug' }).getTitle()).toBe(
      'Fix login bug',
    );
  });

  it('normalizes a restored title, which storage does not check', () => {
    const session = createSessionService({
      title: `  ${'a'.repeat(MAX_TITLE_LENGTH + 5)}  `,
    });

    expect(session.getTitle()).toHaveLength(MAX_TITLE_LENGTH);
  });
});

describe('session history', () => {
  function createSession(history?: SessionRecord[]) {
    let id = 0;
    let clock = 1_753_000_000_000;

    const session = createSessionService({
      ...(history ? { history } : {}),
      createId: () => `id-${(id += 1)}`,
      now: () => (clock += 60_000),
    });

    return { session };
  }

  it('starts empty', () => {
    const { session } = createSession();

    expect(session.getHistory()).toEqual([]);
  });

  it('restores the history it was given', () => {
    const restored: SessionRecord[] = [
      { id: 'a', title: 'Old task', durationMs: 1000, finishedAt: 1 },
    ];
    const { session } = createSession(restored);

    expect(session.getHistory()).toEqual(restored);
  });

  it('files a finished session under the current title', () => {
    const { session } = createSession();

    session.setTitle('Write Q3 report');
    session.recordCompletedFocus(1_500_000);

    expect(session.getHistory()).toEqual([
      {
        id: 'id-1',
        title: 'Write Q3 report',
        durationMs: 1_500_000,
        finishedAt: 1_753_000_060_000,
      },
    ]);
  });

  it('records an untitled session rather than refusing it', () => {
    const { session } = createSession();

    session.recordCompletedFocus(1_500_000);

    expect(session.getHistory()[0]?.title).toBe('');
  });

  it('puts the newest session first', () => {
    const { session } = createSession();

    session.setTitle('First');
    session.recordCompletedFocus(1_500_000);
    session.setTitle('Second');
    session.recordCompletedFocus(1_500_000);

    expect(session.getHistory().map((record) => record.title)).toEqual([
      'Second',
      'First',
    ]);
  });

  it('keeps the title for the next session', () => {
    const { session } = createSession();

    session.setTitle('Write Q3 report');
    session.recordCompletedFocus(1_500_000);

    expect(session.getTitle()).toBe('Write Q3 report');
  });

  it('drops the oldest once the cap is reached', () => {
    const { session } = createSession();

    for (let index = 0; index < MAX_HISTORY_RECORDS + 5; index += 1) {
      session.setTitle(`Task ${index}`);
      session.recordCompletedFocus(1_500_000);
    }

    const history = session.getHistory();

    expect(history).toHaveLength(MAX_HISTORY_RECORDS);
    expect(history[0]?.title).toBe(`Task ${MAX_HISTORY_RECORDS + 4}`);
    expect(history.at(-1)?.title).toBe('Task 5');
  });

  it('empties on clear', () => {
    const { session } = createSession();

    session.recordCompletedFocus(1_500_000);
    session.clearHistory();

    expect(session.getHistory()).toEqual([]);
  });
});

describe('lifetime focus total', () => {
  it('starts at zero', () => {
    expect(createSessionService().getTotalFocusMs()).toBe(0);
  });

  it('restores what it was given', () => {
    expect(
      createSessionService({ totalFocusMs: 90_000 }).getTotalFocusMs(),
    ).toBe(90_000);
  });

  it('adds up every finished session', () => {
    const session = createSessionService();

    session.recordCompletedFocus(1_500_000);
    session.recordCompletedFocus(600_000);

    expect(session.getTotalFocusMs()).toBe(2_100_000);
  });

  it('keeps counting past the point where old records are dropped', () => {
    const session = createSessionService();

    for (let index = 0; index < MAX_HISTORY_RECORDS + 10; index += 1) {
      session.recordCompletedFocus(60_000);
    }

    expect(session.getHistory()).toHaveLength(MAX_HISTORY_RECORDS);
    expect(session.getTotalFocusMs()).toBe((MAX_HISTORY_RECORDS + 10) * 60_000);
  });

  it('survives clearing the history, which only tidies the list', () => {
    const session = createSessionService();

    session.recordCompletedFocus(1_500_000);
    session.clearHistory();

    expect(session.getTotalFocusMs()).toBe(1_500_000);
  });
});
