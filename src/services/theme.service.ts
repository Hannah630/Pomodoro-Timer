import {
  DEFAULT_THEME,
  type ResolvedTheme,
  type Theme,
} from '../models/theme.model';

/**
 * Whatever can answer "does this machine want a dark interface".
 *
 * Injected rather than imported so the rule below — how `system` turns into
 * a concrete scheme, and what happens when the answer changes underneath —
 * can be tested in node, where there is no matchMedia to ask.
 */
export interface SchemeQuery {
  prefersDark(): boolean;
  onChange(listener: () => void): void;
}

/**
 * The answer where there is nobody to ask.
 *
 * Light rather than dark because it is the neutral one: a spec that says
 * nothing about the system preference is a spec about the explicit choices,
 * and this keeps `system` from quietly meaning `dark` in those.
 */
const NO_SYSTEM_PREFERENCE: SchemeQuery = {
  prefersDark: () => false,
  onChange: () => {},
};

export interface ThemeServiceOptions {
  /** The restored choice. Storage has already checked it is a legal one. */
  theme?: Theme;
  scheme?: SchemeQuery;
}

export interface ThemeService {
  /** What the user chose, `system` included. */
  get(): Theme;

  /** What that comes to right now — never `system`. */
  resolved(): ResolvedTheme;

  set(theme: Theme): void;

  /**
   * Calls back when either half of the answer moves: the choice, or the
   * system preference underneath a choice of `system`.
   *
   * No unsubscribe. The theme outlives everything that watches it, and a
   * listener that could go away would be a lie about how this is used.
   */
  subscribe(listener: () => void): void;
}

/**
 * Remembers the colour scheme the user picked, and resolves `system`.
 *
 * The resolving is why this is a service and not a field on a view. Only one
 * of the three values is a fact — the other two are a question for the
 * machine — and a page reading matchMedia in three places would be three
 * chances to disagree about the answer.
 */
export function createThemeService(
  options: ThemeServiceOptions = {},
): ThemeService {
  const scheme = options.scheme ?? NO_SYSTEM_PREFERENCE;
  const listeners = new Set<() => void>();

  let chosen = options.theme ?? DEFAULT_THEME;

  const notify = (): void => listeners.forEach((listener) => listener());

  // The system can change under a running page — a phone crossing into its
  // night appearance is the ordinary case — and while `system` is the choice,
  // that is a change to the answer.
  scheme.onChange(() => {
    if (chosen === 'system') {
      notify();
    }
  });

  return {
    get: () => chosen,

    resolved() {
      if (chosen !== 'system') {
        return chosen;
      }

      return scheme.prefersDark() ? 'dark' : 'light';
    },

    set(theme) {
      if (theme === chosen) {
        return;
      }

      chosen = theme;
      notify();
    },

    subscribe(listener) {
      listeners.add(listener);
    },
  };
}

/**
 * The browser's answer.
 *
 * matchMedia is touched inside the factory, never at import time, so this
 * module stays importable from a spec running in node.
 */
export function createMediaSchemeQuery(): SchemeQuery {
  const query = window.matchMedia('(prefers-color-scheme: dark)');

  return {
    prefersDark: () => query.matches,
    onChange: (listener) => query.addEventListener('change', listener),
  };
}
