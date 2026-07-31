import {
  UNKNOWN_WEATHER_DESCRIPTION,
  WEATHER_DESCRIPTIONS,
  type Weather,
} from '../models/weather.model';

/**
 * The wording for a WMO code.
 *
 * An unrecognised code gets a word rather than a blank: the scale gains
 * entries, and "Unsettled" is wrong in a way that is still readable, where an
 * empty gap in the middle of the line looks like a bug.
 */
export function describeWeather(code: number): string {
  return WEATHER_DESCRIPTIONS[code] ?? UNKNOWN_WEATHER_DESCRIPTION;
}

/**
 * A place name, taken from the IANA zone the forecast came back with.
 *
 * This is the zone's representative city, not the user's — someone in
 * Kaohsiung is told "Taipei", because that is what Asia/Taipei is called. It
 * is accepted rather than corrected: the alternative is a second request to a
 * reverse geocoder, and the name is here to confirm that locating worked at
 * all, not to place anyone precisely.
 */
export function placeFromTimeZone(timeZone: string): string {
  const city = timeZone.split('/').pop() ?? '';

  return city.replace(/_/g, ' ');
}

/**
 * One line: where, what it is now, the range for today, and in a word.
 *
 * Whole degrees. A tenth of a degree is below what anyone glancing at a drawer
 * is deciding anything with, and it makes the line longer than the panel.
 */
export function formatWeather(weather: Weather): string {
  const place = placeFromTimeZone(weather.timeZone);

  const segments = [
    place,
    `${roundDegrees(weather.temperatureC)}°`,
    `${roundDegrees(weather.lowC)}–${roundDegrees(weather.highC)}°`,
    describeWeather(weather.code),
  ];

  return segments.filter((segment) => segment !== '').join(' · ');
}

/** Rounds to a whole degree, without ever producing "-0". */
function roundDegrees(value: number): number {
  const rounded = Math.round(value);

  return rounded === 0 ? 0 : rounded;
}
