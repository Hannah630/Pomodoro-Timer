import { DEFAULT_THEME, THEMES, type Theme } from '../models/theme.model';
import { SECONDS_PER_MINUTE, type TimerSettings } from '../models/timer.model';
import { readItem, writeItem, type KeyValueStorage } from './key-value-storage';

export const STORAGE_KEY = 'pomodoro-timer';

/**
 * Bump when the saved shape changes.
 *
 * 1: durations in whole minutes, with a separate long break and a cycle length
 * 2: durations in seconds, otherwise unchanged
 * 3: one break, so the long break and the cycle length are gone
 *
 * Upgrading in place rather than discarding: a save that is merely old is not
 * a corrupt one, and dropping it would silently reset durations people chose.
 *
 * `theme` arrived after 3 and did not bump it. A version says "this build
 * cannot read that save", and an added field with a default is the opposite
 * of that: a version 3 save is missing nothing this build needs. Bumping
 * would also be actively worse than doing nothing, because the rule for an
 * unrecognised version is to discard the whole save — so a still-open older
 * tab would throw away durations and a lifetime count over a colour scheme
 * it never needed to know about.
 */
export const STORAGE_VERSION = 3;

export interface PersistedState {
  readonly settings: Partial<TimerSettings>;
  readonly completedFocusCount: number;
  /** Lifetime focus time, kept beside the count for the same reason. */
  readonly totalFocusMs: number;
  /** What the user is working on, so a reload does not ask them again. */
  readonly title: string;
  /** The colour scheme, or the choice to keep following the system. */
  readonly theme: Theme;
}

export interface StorageService {
  load(): PersistedState | null;
  save(state: PersistedState): void;
}

/**
 * Reads and writes the state that survives a reload.
 *
 * It checks the envelope only: parseable, an object, the expected version.
 * Whether a duration is sensible is the timer service's question, and it
 * already validates everything it is handed, so there is no second copy of
 * that rule here.
 */
export function createStorageService(storage: KeyValueStorage): StorageService {
  return {
    load() {
      const raw = readItem(storage, STORAGE_KEY);

      if (raw === null) {
        return null;
      }

      const parsed = parseJson(raw);

      if (!isRecord(parsed)) {
        return null;
      }

      const settings = parsed['settings'];
      const savedSettings = isRecord(settings) ? settings : {};

      const settingsFor = upgradeSettings(parsed['version'], savedSettings);

      if (settingsFor === null) {
        return null;
      }

      return {
        settings: settingsFor,
        completedFocusCount: readCount(parsed['completedFocusCount']),
        // Only ever written by version 3; older saves start it from zero,
        // which is the one honest answer available.
        totalFocusMs: readCount(parsed['totalFocusMs']),
        // Checked for shape only. What makes a title acceptable — trimming,
        // the length cap, not splitting an emoji — is the session service's
        // rule, and it applies it to everything it is given.
        title: typeof parsed['title'] === 'string' ? parsed['title'] : '',
        // Checked here, unlike the settings, because there is nothing
        // downstream to reject it: it goes from here to an attribute on the
        // root element, and an unknown value there would match no rule and
        // leave the page in whichever theme it was already wearing.
        theme: readTheme(parsed['theme']),
      };
    },

    save(state) {
      writeItem(
        storage,
        STORAGE_KEY,
        JSON.stringify({ version: STORAGE_VERSION, ...state }),
      );
    },
  };
}

const V1_TO_V2_FIELDS: ReadonlyArray<{ from: string; to: string }> = [
  { from: 'focusMinutes', to: 'focusSeconds' },
  { from: 'shortBreakMinutes', to: 'shortBreakSeconds' },
  { from: 'longBreakMinutes', to: 'longBreakSeconds' },
];

/**
 * Brings saved settings up to the current shape, one version at a time.
 *
 * Chaining the steps rather than writing a direct path per version means the
 * next bump only has to describe the difference it introduces, instead of
 * every route into it.
 *
 * Returns null for a version this build has never heard of.
 */
function upgradeSettings(
  version: unknown,
  saved: Record<string, unknown>,
): Partial<TimerSettings> | null {
  switch (version) {
    case STORAGE_VERSION:
      return saved as Partial<TimerSettings>;
    case 2:
      return dropTheLongBreak(saved);
    case 1:
      return dropTheLongBreak(minutesToSeconds(saved));
    default:
      return null;
  }
}

/**
 * Version 1 to 2.
 *
 * Only fields that are actually numbers are converted; anything else is left
 * out, and the timer service then falls back to its default for it, exactly
 * as it does for a malformed current save.
 */
function minutesToSeconds(
  saved: Record<string, unknown>,
): Record<string, unknown> {
  const upgraded: Record<string, unknown> = {};

  V1_TO_V2_FIELDS.forEach(({ from, to }) => {
    const minutes = saved[from];

    if (typeof minutes === 'number' && Number.isFinite(minutes)) {
      upgraded[to] = minutes * SECONDS_PER_MINUTE;
    }
  });

  return upgraded;
}

/**
 * Version 2 to 3.
 *
 * The short break becomes the only break. The long break and the cycle length
 * are dropped rather than merged: there is nowhere left to put them, and the
 * short break is the one that was actually being used.
 */
function dropTheLongBreak(
  saved: Record<string, unknown>,
): Partial<TimerSettings> {
  const upgraded: { -readonly [K in keyof TimerSettings]?: number } = {};

  if (isFiniteNumber(saved['focusSeconds'])) {
    upgraded.focusSeconds = saved['focusSeconds'];
  }

  if (isFiniteNumber(saved['shortBreakSeconds'])) {
    upgraded.breakSeconds = saved['shortBreakSeconds'];
  }

  return upgraded;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Anything that is not one of the three known choices means the default:
 * a save written by a build that offered a fourth is no more trustworthy
 * here than one somebody edited by hand.
 */
function readTheme(value: unknown): Theme {
  return THEMES.includes(value as Theme) ? (value as Theme) : DEFAULT_THEME;
}

/**
 * Storage is the only source of the completed count, so it is checked here
 * once rather than again in the timer service.
 */
function readCount(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}
