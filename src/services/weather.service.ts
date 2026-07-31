import {
  WEATHER_MAX_AGE_MS,
  type Coordinates,
  type Weather,
} from '../models/weather.model';
import { readItem, writeItem, type KeyValueStorage } from './key-value-storage';
import type { FetchJson } from './network';

/**
 * A third key, for the same reason there is a second one.
 *
 * A reading is disposable and rewritten every half hour; the settings are
 * neither. Keeping them apart means a forecast that comes back malformed
 * cannot cost anyone their durations.
 */
export const WEATHER_STORAGE_KEY = 'pomodoro-timer:weather';

export const WEATHER_STORAGE_VERSION = 1;

const FORECAST_ENDPOINT = 'https://api.open-meteo.com/v1/forecast';

export interface WeatherServiceOptions {
  storage: KeyValueStorage;
  fetchJson: FetchJson;
  /** Injected rather than imported, so a refusal can be tested in node. */
  locate: () => Promise<Coordinates | null>;
  now?: () => number;
}

export interface WeatherService {
  /**
   * The stored reading, if there is one and it is still current.
   *
   * Separate from load() so the caller can show something immediately and
   * decide for itself whether a request is worth making.
   */
  cached(): Weather | null;

  /**
   * A current reading: the cache if it holds, otherwise a located and fetched
   * one. Null whenever any step of that declines.
   */
  load(): Promise<Weather | null>;
}

/**
 * Today's weather where the user is.
 *
 * Open-Meteo because this site is served from GitHub Pages: static hosting has
 * nowhere to keep a secret, and every provider that wants an API key would
 * have that key shipped in the bundle. This one needs none.
 *
 * Nothing here throws. A forecast is an ornament on a countdown, and none of
 * the ways it can fail — no permission, no network, a shape that changed — is
 * worth interrupting anyone over. They all arrive as null.
 */
export function createWeatherService({
  storage,
  fetchJson,
  locate,
  now = () => Date.now(),
}: WeatherServiceOptions): WeatherService {
  function cached(): Weather | null {
    const raw = readItem(storage, WEATHER_STORAGE_KEY);

    if (raw === null) {
      return null;
    }

    const parsed = parseJson(raw);

    if (
      !isRecord(parsed) ||
      parsed['version'] !== WEATHER_STORAGE_VERSION ||
      !isFiniteNumber(parsed['fetchedAt']) ||
      now() - parsed['fetchedAt'] >= WEATHER_MAX_AGE_MS
    ) {
      return null;
    }

    const weather = parsed['weather'];

    return isWeather(weather) ? weather : null;
  }

  return {
    cached,

    async load() {
      const stored = cached();

      if (stored !== null) {
        return stored;
      }

      const coordinates = await locate();

      if (coordinates === null) {
        return null;
      }

      try {
        const weather = toWeather(await fetchJson(forecastUrl(coordinates)));

        if (weather !== null) {
          writeItem(
            storage,
            WEATHER_STORAGE_KEY,
            JSON.stringify({
              version: WEATHER_STORAGE_VERSION,
              fetchedAt: now(),
              weather,
            }),
          );
        }

        return weather;
      } catch {
        return null;
      }
    },
  };
}

/**
 * Asks for exactly the four values the line on screen shows.
 *
 * The coordinates are rounded to about a kilometre first. The forecast is the
 * same either way — weather does not change across a street — and a request
 * that leaves the machine should not carry a more precise position than the
 * answer needs.
 *
 * timezone=auto is what makes the daily range mean "today where you are" and
 * is also where the place name comes from, which saves a second request to
 * turn coordinates into a word.
 */
function forecastUrl({ latitude, longitude }: Coordinates): string {
  const query = new URLSearchParams({
    latitude: latitude.toFixed(2),
    longitude: longitude.toFixed(2),
    current: 'temperature_2m,weather_code',
    daily: 'temperature_2m_max,temperature_2m_min',
    timezone: 'auto',
    forecast_days: '1',
  });

  return `${FORECAST_ENDPOINT}?${query.toString()}`;
}

/** Narrows a forecast response to the four values the line on screen shows. */
function toWeather(value: unknown): Weather | null {
  if (!isRecord(value)) {
    return null;
  }

  const current = value['current'];
  const daily = value['daily'];
  const timeZone = value['timezone'];

  if (!isRecord(current) || !isRecord(daily) || typeof timeZone !== 'string') {
    return null;
  }

  const temperatureC = current['temperature_2m'];
  const code = current['weather_code'];
  const highC = firstOf(daily['temperature_2m_max']);
  const lowC = firstOf(daily['temperature_2m_min']);

  if (
    !isFiniteNumber(temperatureC) ||
    !isFiniteNumber(code) ||
    !isFiniteNumber(highC) ||
    !isFiniteNumber(lowC)
  ) {
    return null;
  }

  return { temperatureC, highC, lowC, code, timeZone };
}

/**
 * Recognises a stored reading.
 *
 * A second check rather than a reuse of the one above, because the two shapes
 * differ on purpose: what is written to storage is the four values this app
 * decided on, not the response they were lifted out of. Storing the response
 * whole would put a provider's field names in the user's browser, where a
 * change to them becomes a migration.
 */
function isWeather(value: unknown): value is Weather {
  return (
    isRecord(value) &&
    isFiniteNumber(value['temperatureC']) &&
    isFiniteNumber(value['highC']) &&
    isFiniteNumber(value['lowC']) &&
    isFiniteNumber(value['code']) &&
    typeof value['timeZone'] === 'string'
  );
}

/** Today is the only day asked for, so today is the first entry. */
function firstOf(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : undefined;
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

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
