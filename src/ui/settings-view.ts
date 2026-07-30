import {
  MAX_SESSION_MINUTES,
  MIN_SESSION_MINUTES,
  type TimerSettings,
} from '../models/timer.model';
import { queryElement } from './dom';

type DurationKey = Extract<
  keyof TimerSettings,
  'focusMinutes' | 'shortBreakMinutes' | 'longBreakMinutes'
>;

/** TimerSettings is read-only, so build the patch in a writable shape. */
type DurationPatch = { -readonly [K in DurationKey]?: number };

const DURATION_FIELDS: ReadonlyArray<{ selector: string; key: DurationKey }> = [
  { selector: '[data-focus-minutes]', key: 'focusMinutes' },
  { selector: '[data-short-break-minutes]', key: 'shortBreakMinutes' },
  { selector: '[data-long-break-minutes]', key: 'longBreakMinutes' },
];

export interface SettingsHandlers {
  onChange(patch: Partial<TimerSettings>): void;
}

export interface SettingsView {
  render(settings: TimerSettings): void;
}

/**
 * The duration form. It parses what the user typed and reports it upwards;
 * deciding what counts as a valid duration is the timer service's job.
 */
export function createSettingsView(
  root: ParentNode,
  handlers: SettingsHandlers,
): SettingsView {
  let effective: TimerSettings | null = null;

  const fields = DURATION_FIELDS.map(({ selector, key }) => {
    const input = queryElement<HTMLInputElement>(root, selector);

    // Taken from the model so the bounds are stated in exactly one place.
    input.min = String(MIN_SESSION_MINUTES);
    input.max = String(MAX_SESSION_MINUTES);

    input.addEventListener('change', () => {
      const minutes = parseMinutes(input.value);

      // Nothing usable was typed, so show the value still in effect.
      if (minutes === null) {
        input.value = effective ? String(effective[key]) : input.value;
        return;
      }

      // Out of range values are sent as they are; the service clamps them and
      // the corrected value comes back through render.
      const patch: DurationPatch = {};
      patch[key] = minutes;
      handlers.onChange(patch);
    });

    return { input, key };
  });

  return {
    render(settings) {
      effective = settings;

      fields.forEach(({ input, key }) => {
        input.value = String(settings[key]);
      });
    },
  };
}

/** Turns typed text into a number, or null when it is not one. */
export function parseMinutes(raw: string): number | null {
  const trimmed = raw.trim();

  if (trimmed === '') {
    return null;
  }

  const value = Number(trimmed);

  return Number.isFinite(value) ? value : null;
}
