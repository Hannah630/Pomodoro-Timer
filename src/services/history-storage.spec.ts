import { describe, expect, it } from 'vitest';

import {
  MAX_HISTORY_RECORDS,
  type SessionRecord,
} from '../models/session.model';
import {
  createHistoryStorage,
  HISTORY_STORAGE_KEY,
  HISTORY_STORAGE_VERSION,
} from './history-storage';
import type { KeyValueStorage } from './key-value-storage';

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

function createRecord(overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: 'a1',
    title: 'Write Q3 report',
    durationMs: 1_500_000,
    finishedAt: 1_753_000_000_000,
    ...overrides,
  };
}

function storedPayload(records: unknown[], version = HISTORY_STORAGE_VERSION) {
  return JSON.stringify({ version, records });
}

describe('history storage', () => {
  describe('load', () => {
    it('starts empty when nothing is stored', () => {
      expect(createHistoryStorage(createFakeStorage()).load()).toEqual([]);
    });

    it('reads back what was saved', () => {
      const storage = createHistoryStorage(createFakeStorage());
      const records = [createRecord()];

      storage.save(records);

      expect(storage.load()).toEqual(records);
    });

    it('starts empty when the save is not valid JSON', () => {
      expect(
        createHistoryStorage(createFakeStorage('not json {{')).load(),
      ).toEqual([]);
    });

    it('starts empty when the save is from a different version', () => {
      const storage = createHistoryStorage(
        createFakeStorage(storedPayload([createRecord()], 99)),
      );

      expect(storage.load()).toEqual([]);
    });

    it('starts empty when records is not an array', () => {
      const storage = createHistoryStorage(
        createFakeStorage(
          JSON.stringify({
            version: HISTORY_STORAGE_VERSION,
            records: 'nonsense',
          }),
        ),
      );

      expect(storage.load()).toEqual([]);
    });

    it('drops a malformed record and keeps the rest', () => {
      const good = createRecord({ id: 'good' });
      const storage = createHistoryStorage(
        createFakeStorage(
          storedPayload([
            good,
            { id: 'no-title', durationMs: 1000, finishedAt: 1 },
            { ...createRecord(), durationMs: 'twenty' },
            { ...createRecord(), finishedAt: -1 },
            null,
            'nope',
          ]),
        ),
      );

      expect(storage.load()).toEqual([good]);
    });

    it('caps a hand-edited save that is far too long', () => {
      const tooMany = Array.from({ length: MAX_HISTORY_RECORDS + 20 }, (_, i) =>
        createRecord({ id: String(i) }),
      );
      const storage = createHistoryStorage(
        createFakeStorage(storedPayload(tooMany)),
      );

      expect(storage.load()).toHaveLength(MAX_HISTORY_RECORDS);
    });
  });

  describe('save', () => {
    it('never writes more than the cap', () => {
      const fake = createFakeStorage();
      const storage = createHistoryStorage(fake);

      storage.save(
        Array.from({ length: MAX_HISTORY_RECORDS + 20 }, (_, i) =>
          createRecord({ id: String(i) }),
        ),
      );

      expect(storage.load()).toHaveLength(MAX_HISTORY_RECORDS);
    });

    it('does not throw when storage refuses the write', () => {
      const storage = createHistoryStorage({
        getItem: () => null,
        setItem: () => {
          throw new Error('QuotaExceededError');
        },
      });

      expect(() => storage.save([createRecord()])).not.toThrow();
    });
  });
});
