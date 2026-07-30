const MS_PER_CENTISECOND = 10;
const CENTISECONDS_PER_SECOND = 100;
const SECONDS_PER_MINUTE = 60;

export interface Countdown {
  /** Minutes and seconds, "24:37". */
  readonly clock: string;
  /** Hundredths of a second, "82". */
  readonly centiseconds: string;
}

/**
 * Splits a remaining duration into the two parts the display shows.
 *
 * Both come from one rounding of the whole value, not two: rounding the clock
 * and the fraction separately would let 24:59.5 read as "25:00" beside "50".
 * Rounding up keeps a fresh 25 minute timer at 25:00·00 instead of dropping a
 * hundredth the instant it starts, and it lands exactly on 00:00·00.
 */
export function formatCountdown(ms: number): Countdown {
  const totalCentiseconds = Math.ceil(
    Math.max(0, ms) / MS_PER_CENTISECOND,
  );

  const centiseconds = totalCentiseconds % CENTISECONDS_PER_SECOND;
  const totalSeconds = Math.floor(
    totalCentiseconds / CENTISECONDS_PER_SECOND,
  );
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
  const seconds = totalSeconds % SECONDS_PER_MINUTE;

  return {
    clock: `${padTwoDigits(minutes)}:${padTwoDigits(seconds)}`,
    centiseconds: padTwoDigits(centiseconds),
  };
}

function padTwoDigits(value: number): string {
  return value.toString().padStart(2, '0');
}
