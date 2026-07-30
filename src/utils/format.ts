/**
 * Formats a duration in milliseconds as "mm:ss".
 *
 * Seconds are rounded up on purpose: a timer started at 25 minutes should
 * read "25:00" rather than immediately dropping to "24:59", and it reaches
 * "00:00" exactly when the time runs out. Negative input is clamped to zero.
 */
export function formatTime(ms: number): string {
  const totalSeconds = Math.ceil(Math.max(0, ms) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${padTwoDigits(minutes)}:${padTwoDigits(seconds)}`;
}

function padTwoDigits(value: number): string {
  return value.toString().padStart(2, '0');
}
