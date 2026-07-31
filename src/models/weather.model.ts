/** A point on the globe, as the browser reports it. */
export interface Coordinates {
  readonly latitude: number;
  readonly longitude: number;
}

/**
 * One reading: what it is doing outside now, and the range for the day.
 *
 * The time zone is carried rather than a place name because that is what the
 * forecast returns — turning it into something readable is the view's job.
 */
export interface Weather {
  readonly temperatureC: number;
  readonly highC: number;
  readonly lowC: number;
  /** A WMO code. Kept as the number so the wording stays in one place. */
  readonly code: number;
  /** An IANA zone, e.g. "Asia/Taipei". */
  readonly timeZone: string;
}

/**
 * How long a reading is treated as current.
 *
 * Long enough that opening and closing the drawer a few times costs one
 * request, short enough that the number is not stale by the time anyone reads
 * it. It also bounds how long a stale location survives being carried
 * somewhere else.
 */
export const WEATHER_MAX_AGE_MS = 30 * 60 * 1000;

/**
 * WMO code 4677, which is what the forecast speaks, in the words a person
 * would use.
 *
 * The scale distinguishes more than a one line summary can carry — three
 * intensities of drizzle, three of rain, freezing variants of both — so the
 * neighbouring codes share a word. Anyone who needs to know whether it is
 * "moderate" or "dense" drizzle can look out of the window.
 */
export const WEATHER_DESCRIPTIONS: Readonly<Record<number, string>> = {
  0: 'Clear',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Freezing fog',
  51: 'Drizzle',
  53: 'Drizzle',
  55: 'Heavy drizzle',
  56: 'Freezing drizzle',
  57: 'Freezing drizzle',
  61: 'Light rain',
  63: 'Rain',
  65: 'Heavy rain',
  66: 'Freezing rain',
  67: 'Freezing rain',
  71: 'Light snow',
  73: 'Snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Showers',
  81: 'Showers',
  82: 'Heavy showers',
  85: 'Snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with hail',
  99: 'Thunderstorm with hail',
};

/** Shown for a code the table above does not know. */
export const UNKNOWN_WEATHER_DESCRIPTION = 'Unsettled';
