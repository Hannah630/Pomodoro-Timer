import { describe, expect, it } from 'vitest';

import {
  MAX_HISTORY_AGE_DAYS,
  MAX_HISTORY_RECORDS,
  MS_PER_DAY,
  type SessionRecord,
} from '../models/session.model';
import {
  createHistoryStorage,
  HISTORY_STORAGE_KEY,
  HISTORY_STORAGE_VERSION,
} from './history-storage';
import type { KeyValueStorage } from './key-value-storage';

/** A fixed present, so the age limit behaves the same on every run. */
const NOW = 1_800_000_000_000;

function createFakeStorage(stored?: string): KeyValueStorage {
  const data = new Map<string, string>();

  if (stored !== undefined) {
    data.set(HISTORY_STORAGE_KEY, stored);
  }

  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

function createStorage(stored?: string) {
  return createHistoryStorage(createFakeStorage(stored), () => NOW);
}

function createRecord(overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: 'a1',
    title: 'Write Q3 report',
    durationMs: 1_500_000,
    finishedAt: NOW - MS_PER_DAY,
    ...overrides,
  };
}

function storedPayload(records: unknown[], version = HISTORY_STORAGE_VERSION) {
  return JSON.stringify({ version, records });
}

describe('history storage', () => {
  describe('load', () => {
    it('starts empty when nothing is stored', () => {
      expect(createStorage().load()).toEqual([]);
    });

    it('reads back what was saved', () => {
      const storage = createStorage();
      const records = [createRecord()];

      storage.save(records);

      expect(storage.load()).toEqual(records);
    });

    it('starts empty when the save is not valid JSON', () => {
      expect(createStorage('not json {{').load()).toEqual([]);
    });

    it('starts empty when the save is from a different version', () => {
      const storage = createStorage(storedPayload([createRecord()], 99));

      expect(storage.load()).toEqual([]);
    });

    it('starts empty when records is not an array', () => {
      const storage = createStorage(
        JSON.stringify({
          version: HISTORY_STORAGE_VERSION,
          records: 'nonsense',
        }),
      );

      expect(storage.load()).toEqual([]);
    });

    it('drops a malformed record and keeps the rest', () => {
      const good = createRecord({ id: 'good' });
      const storage = createStorage(
        storedPayload([
          good,
          { id: 'no-title', durationMs: 1000, finishedAt: 1 },
          { ...createRecord(), durationMs: 'twenty' },
          { ...createRecord(), finishedAt: -1 },
          null,
          'nope',
        ]),
      );

      expect(storage.load()).toEqual([good]);
    });

    it('drops records past the age limit and keeps the rest', () => {
      const recent = createRecord({
        id: 'recent',
        finishedAt: NOW - 10 * MS_PER_DAY,
      });
      const stale = createRecord({
        id: 'stale',
        finishedAt: NOW - (MAX_HISTORY_AGE_DAYS + 1) * MS_PER_DAY,
      });

      const storage = createStorage(storedPayload([recent, stale]));

      expect(storage.load()).toEqual([recent]);
    });

    it('caps a hand-edited save that is far too long', () => {
      const tooMany = Array.from({ length: MAX_HISTORY_RECORDS + 20 }, (_, i) =>
        createRecord({ id: String(i) }),
      );
      const storage = createStorage(storedPayload(tooMany));

      expect(storage.load()).toHaveLength(MAX_HISTORY_RECORDS);
    });
  });

  describe('when the browser blocks storage outright', () => {
    it('starts empty rather than throwing on read', () => {
      const storage = createHistoryStorage(
        {
          getItem: () => {
            throw new Error('SecurityError');
          },
          setItem: () => undefined,
        },
        () => NOW,
      );

      expect(() => storage.load()).not.toThrow();
      expect(storage.load()).toEqual([]);
    });
  });

  describe('save', () => {
    it('never writes more than the cap', () => {
      const storage = createStorage();

      storage.save(
        Array.from({ length: MAX_HISTORY_RECORDS + 20 }, (_, i) =>
          createRecord({ id: String(i) }),
        ),
      );

      expect(storage.load()).toHaveLength(MAX_HISTORY_RECORDS);
    });

    it('does not throw when storage refuses the write', () => {
      const storage = createHistoryStorage(
        {
          getItem: () => null,
          setItem: () => {
            throw new Error('QuotaExceededError');
          },
        },
        () => NOW,
      );

      expect(() => storage.save([createRecord()])).not.toThrow();
    });
  });
});
