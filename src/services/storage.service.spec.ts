import { describe, expect, it } from 'vitest';

import type { KeyValueStorage } from './key-value-storage';
import {
  createStorageService,
  STORAGE_KEY,
  STORAGE_VERSION,
} from './storage.service';

function createFakeStorage(stored?: string): KeyValueStorage {
  const data = new Map<string, string>();

  if (stored !== undefined) {
    data.set(STORAGE_KEY, stored);
  }

  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

function storedPayload(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    version: STORAGE_VERSION,
    settings: { focusMinutes: 30 },
    completedFocusCount: 3,
    ...overrides,
  });
}

describe('storage service', () => {
  describe('load', () => {
    it('returns nothing when there is no save', () => {
      const service = createStorageService(createFakeStorage());

      expect(service.load()).toBeNull();
    });

    it('reads back what was saved', () => {
      const storage = createFakeStorage();
      const service = createStorageService(storage);

      service.save({ settings: { focusMinutes: 30 }, completedFocusCount: 3 });

      expect(service.load()).toEqual({
        settings: { focusMinutes: 30 },
        completedFocusCount: 3,
      });
    });

    it('ignores a save that is not valid JSON', () => {
      const service = createStorageService(createFakeStorage('not json {{'));

      expect(service.load()).toBeNull();
    });

    it('ignores a save from a different version', () => {
      const service = createStorageService(
        createFakeStorage(storedPayload({ version: 99 })),
      );

      expect(service.load()).toBeNull();
    });

    it('ignores a save that is not an object', () => {
      expect(createStorageService(createFakeStorage('5')).load()).toBeNull();
      expect(createStorageService(createFakeStorage('null')).load()).toBeNull();
      expect(createStorageService(createFakeStorage('[1,2]')).load()).toBeNull();
    });

    it('falls back to empty settings when the field is the wrong type', () => {
      const service = createStorageService(
        createFakeStorage(storedPayload({ settings: 'nonsense' })),
      );

      expect(service.load()?.settings).toEqual({});
    });

    it('passes malformed settings through for the timer service to reject', () => {
      const service = createStorageService(
        createFakeStorage(storedPayload({ settings: { focusMinutes: 'abc' } })),
      );

      expect(service.load()?.settings).toEqual({ focusMinutes: 'abc' });
    });

    it('repairs a completed count that is missing or nonsensical', () => {
      const cases: Array<[unknown, number]> = [
        [undefined, 0],
        ['seven', 0],
        [-4, 0],
        [2.7, 2],
      ];

      cases.forEach(([stored, expected]) => {
        const service = createStorageService(
          createFakeStorage(storedPayload({ completedFocusCount: stored })),
        );

        expect(service.load()?.completedFocusCount).toBe(expected);
      });
    });
  });

  describe('save', () => {
    it('does not throw when storage refuses the write', () => {
      const service = createStorageService({
        getItem: () => null,
        setItem: () => {
          throw new Error('QuotaExceededError');
        },
      });

      expect(() =>
        service.save({ settings: {}, completedFocusCount: 1 }),
      ).not.toThrow();
    });
  });
});
