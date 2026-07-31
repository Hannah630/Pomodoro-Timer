import { describe, expect, it, vi } from 'vitest';

import { createThemeService, type SchemeQuery } from './theme.service';

/** A system preference the test can move, the way a phone does at dusk. */
function createScheme(prefersDark = false) {
  const listeners = new Set<() => void>();

  const scheme: SchemeQuery = {
    prefersDark: () => prefersDark,
    onChange: (listener) => {
      listeners.add(listener);
    },
  };

  return {
    scheme,
    turnDark: (value: boolean) => {
      prefersDark = value;
      listeners.forEach((listener) => listener());
    },
  };
}

describe('createThemeService', () => {
  describe('the default', () => {
    it('follows the system when nothing was restored', () => {
      const service = createThemeService();

      expect(service.get()).toBe('system');
    });

    it('resolves without a system to ask', () => {
      const service = createThemeService();

      expect(service.resolved()).toBe('light');
    });
  });

  describe('resolving', () => {
    it('asks the system while the choice is to follow it', () => {
      const { scheme, turnDark } = createScheme();
      const service = createThemeService({ scheme });

      expect(service.resolved()).toBe('light');

      turnDark(true);

      expect(service.resolved()).toBe('dark');
    });

    it('ignores the system once a choice is made', () => {
      const { scheme, turnDark } = createScheme(true);
      const service = createThemeService({ theme: 'light', scheme });

      expect(service.resolved()).toBe('light');

      turnDark(false);

      // Still light: the point of choosing is that the machine stops deciding.
      expect(service.resolved()).toBe('light');
    });

    it('keeps the choice itself separate from what it resolves to', () => {
      const { scheme } = createScheme(true);
      const service = createThemeService({ scheme });

      expect(service.get()).toBe('system');
      expect(service.resolved()).toBe('dark');
    });
  });

  describe('subscribers', () => {
    it('hears a new choice', () => {
      const service = createThemeService();
      const listener = vi.fn();

      service.subscribe(listener);
      service.set('dark');

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('says nothing when the choice is the one already in effect', () => {
      const service = createThemeService({ theme: 'dark' });
      const listener = vi.fn();

      service.subscribe(listener);
      service.set('dark');

      expect(listener).not.toHaveBeenCalled();
    });

    it('hears the system turning while following it', () => {
      const { scheme, turnDark } = createScheme();
      const service = createThemeService({ scheme });
      const listener = vi.fn();

      service.subscribe(listener);
      turnDark(true);

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('stays quiet when the system turns under an explicit choice', () => {
      const { scheme, turnDark } = createScheme();
      const service = createThemeService({ theme: 'light', scheme });
      const listener = vi.fn();

      service.subscribe(listener);
      turnDark(true);

      // Nothing the user can see has changed, so there is nothing to redraw.
      expect(listener).not.toHaveBeenCalled();
    });

    it('hears the choice go back to following the system', () => {
      const { scheme } = createScheme(true);
      const service = createThemeService({ theme: 'light', scheme });
      const listener = vi.fn();

      service.subscribe(listener);
      service.set('system');

      expect(listener).toHaveBeenCalledTimes(1);
      expect(service.resolved()).toBe('dark');
    });
  });
});
