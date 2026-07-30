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
    settings: { focusSeconds: 1800 },
    completedFocusCount: 3,
    totalFocusMs: 4500,
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
      const service = createStorageService(createFakeStorage());
      const state = {
        settings: { focusSeconds: 1800 },
        completedFocusCount: 3,
        totalFocusMs: 4500,
      };

      service.save(state);

      expect(service.load()).toEqual(state);
    });

    it('ignores a save that is not valid JSON', () => {
      const service = createStorageService(createFakeStorage('not json {{'));

      expect(service.load()).toBeNull();
    });

    it('ignores a save from a version it does not know', () => {
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
        createFakeStorage(storedPayload({ settings: { focusSeconds: 'abc' } })),
      );

      expect(service.load()?.settings).toEqual({ focusSeconds: 'abc' });
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

    it('starts the lifetime total at zero when it is missing or nonsensical', () => {
      const cases: Array<[unknown, number]> = [
        [undefined, 0],
        ['ages', 0],
        [-1000, 0],
      ];

      cases.forEach(([stored, expected]) => {
        const service = createStorageService(
          createFakeStorage(storedPayload({ totalFocusMs: stored })),
        );

        expect(service.load()?.totalFocusMs).toBe(expected);
      });
    });
  });

  describe('upgrading an older save', () => {
    function oldPayload(
      version: number,
      settings: unknown,
      completedFocusCount: unknown = 3,
    ) {
      return JSON.stringify({ version, settings, completedFocusCount });
    }

    it('carries a version 2 save forward, keeping the short break', () => {
      const service = createStorageService(
        createFakeStorage(
          oldPayload(2, {
            focusSeconds: 1800,
            shortBreakSeconds: 300,
            longBreakSeconds: 1200,
            roundsPerLongBreak: 4,
          }),
        ),
      );

      expect(service.load()).toEqual({
        settings: { focusSeconds: 1800, breakSeconds: 300 },
        completedFocusCount: 3,
        totalFocusMs: 0,
      });
    });

    it('runs a version 1 save through both steps', () => {
      const service = createStorageService(
        createFakeStorage(
          oldPayload(1, {
            focusMinutes: 30,
            shortBreakMinutes: 5,
            longBreakMinutes: 20,
            roundsPerLongBreak: 4,
          }),
        ),
      );

      expect(service.load()?.settings).toEqual({
        focusSeconds: 1800,
        breakSeconds: 300,
      });
    });

    it('keeps the session count across the upgrade', () => {
      const service = createStorageService(
        createFakeStorage(oldPayload(1, { focusMinutes: 30 }, 12)),
      );

      expect(service.load()?.completedFocusCount).toBe(12);
    });

    it('leaves out fields it cannot convert, rather than guessing', () => {
      const service = createStorageService(
        createFakeStorage(
          oldPayload(1, { focusMinutes: 30, shortBreakMinutes: 'abc' }),
        ),
      );

      expect(service.load()?.settings).toEqual({ focusSeconds: 1800 });
    });

    it('upgrades an empty settings object to an empty one', () => {
      const service = createStorageService(createFakeStorage(oldPayload(1, {})));

      expect(service.load()?.settings).toEqual({});
    });
  });

  describe('when the browser blocks storage outright', () => {
    const blocked: KeyValueStorage = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('SecurityError');
      },
    };

    // Private browsing and blocked cookies make even reading throw. This runs
    // while the modules are still loading, so an unguarded read would take the
    // whole app down before a single button was wired up.
    it('starts fresh rather than throwing on read', () => {
      expect(() => createStorageService(blocked).load()).not.toThrow();
      expect(createStorageService(blocked).load()).toBeNull();
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
        service.save({
          settings: {},
          completedFocusCount: 1,
          totalFocusMs: 1000,
        }),
      ).not.toThrow();
    });
  });
});
