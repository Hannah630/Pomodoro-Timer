import {
  MAX_SESSION_SECONDS,
  SECONDS_PER_MINUTE,
  type TimerSettings,
} from '../models/timer.model';
import { queryElement } from './dom';

type DurationKey = Extract<
  keyof TimerSettings,
  'focusSeconds' | 'shortBreakSeconds' | 'longBreakSeconds'
>;

/** TimerSettings is read-only, so build the patch in a writable shape. */
type DurationPatch = { -readonly [K in DurationKey]?: number };

const DURATION_FIELDS: ReadonlyArray<{
  minutes: string;
  seconds: string;
  key: DurationKey;
}> = [
  {
    minutes: '[data-focus-minutes]',
    seconds: '[data-focus-seconds]',
    key: 'focusSeconds',
  },
  {
    minutes: '[data-short-break-minutes]',
    seconds: '[data-short-break-seconds]',
    key: 'shortBreakSeconds',
  },
  {
    minutes: '[data-long-break-minutes]',
    seconds: '[data-long-break-seconds]',
    key: 'longBreakSeconds',
  },
];

export interface SettingsHandlers {
  onChange(patch: Partial<TimerSettings>): void;
}

export interface SettingsView {
  render(settings: TimerSettings): void;
}

/**
 * The duration form.
 *
 * Minutes and seconds are two fields here but one number in the model, so the
 * form reads both boxes on every change and reports their total. Deciding
 * what counts as a valid duration is still the timer service's job.
 */
export function createSettingsView(
  root: ParentNode,
  handlers: SettingsHandlers,
): SettingsView {
  let effective: TimerSettings | null = null;

  const fields = DURATION_FIELDS.map(({ minutes, seconds, key }) => {
    const minutesInput = queryElement<HTMLInputElement>(root, minutes);
    const secondsInput = queryElement<HTMLInputElement>(root, seconds);

    // Taken from the model so the ceiling is stated in exactly one place.
    minutesInput.max = String(Math.floor(MAX_SESSION_SECONDS / SECONDS_PER_MINUTE));

    const field = { minutesInput, secondsInput, key };

    [minutesInput, secondsInput].forEach((input) => {
      input.addEventListener('change', () => {
        const total = readTotalSeconds(field);

        // Nothing usable was typed, so show the values still in effect.
        if (total === null) {
          if (effective) {
            writeField(field, effective[key]);
          }
          return;
        }

        // Out of range totals are sent as they are; the service clamps them
        // and the corrected value comes back through render.
        const patch: DurationPatch = {};
        patch[key] = total;
        handlers.onChange(patch);
      });
    });

    return field;
  });

  return {
    render(settings) {
      effective = settings;

      fields.forEach((field) => writeField(field, settings[field.key]));
    },
  };
}

interface DurationField {
  minutesInput: HTMLInputElement;
  secondsInput: HTMLInputElement;
  key: DurationKey;
}

function readTotalSeconds(field: DurationField): number | null {
  const minutes = parseCount(field.minutesInput.value);
  const seconds = parseCount(field.secondsInput.value);

  if (minutes === null || seconds === null) {
    return null;
  }

  return minutes * SECONDS_PER_MINUTE + seconds;
}

function writeField(field: DurationField, totalSeconds: number): void {
  field.minutesInput.value = String(Math.floor(totalSeconds / SECONDS_PER_MINUTE));
  field.secondsInput.value = String(totalSeconds % SECONDS_PER_MINUTE);
}

/** Turns typed text into a number, or null when it is not one. */
export function parseCount(raw: string): number | null {
  const trimmed = raw.trim();

  if (trimmed === '') {
    return null;
  }

  const value = Number(trimmed);

  return Number.isFinite(value) ? value : null;
}
