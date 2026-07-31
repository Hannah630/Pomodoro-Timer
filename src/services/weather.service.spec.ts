import { describe, expect, it, vi } from 'vitest';

import { WEATHER_MAX_AGE_MS, type Coordinates } from '../models/weather.model';
import type { KeyValueStorage } from './key-value-storage';
import {
  createWeatherService,
  WEATHER_STORAGE_KEY,
  WEATHER_STORAGE_VERSION,
} from './weather.service';

/** A fixed present, so the cache age behaves the same on every run. */
const NOW = 1_800_000_000_000;

const COORDINATES: Coordinates = { latitude: 25.0375, longitude: 121.5637 };

/** The four values the app reads, in the shape Open-Meteo returns them. */
function forecastResponse(overrides: Record<string, unknown> = {}) {
  return {
    timezone: 'Asia/Taipei',
    current: { temperature_2m: 26.5, weather_code: 2 },
    daily: {
      temperature_2m_max: [35],
      temperature_2m_min: [26.2],
    },
    ...overrides,
  };
}

const READING = {
  temperatureC: 26.5,
  highC: 35,
  lowC: 26.2,
  code: 2,
  timeZone: 'Asia/Taipei',
};

function createFakeStorage(stored?: string) {
  const data = new Map<string, string>();

  if (stored !== undefined) {
    data.set(WEATHER_STORAGE_KEY, stored);
  }

  const storage: KeyValueStorage = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };

  return { storage, data };
}

function cachePayload(
  weather: unknown = READING,
  fetchedAt: unknown = NOW,
  version: unknown = WEATHER_STORAGE_VERSION,
) {
  return JSON.stringify({ version, fetchedAt, weather });
}

interface ServiceOverrides {
  stored?: string;
  response?: unknown;
  coordinates?: Coordinates | null;
  now?: number;
}

function createService({
  stored,
  response = forecastResponse(),
  coordinates = COORDINATES,
  now = NOW,
}: ServiceOverrides = {}) {
  const { storage, data } = createFakeStorage(stored);
  // The parameter is declared although the fake ignores it: it is what makes
  // the recorded call carry the URL the service asked for.
  const fetchJson = vi.fn(async (_url: string) => response);
  const locate = vi.fn(async () => coordinates);

  const service = createWeatherService({
    storage,
    fetchJson,
    locate,
    now: () => now,
  });

  return { service, fetchJson, locate, data };
}

describe('weather service', () => {
  describe('load', () => {
    it('reports what the forecast says', async () => {
      const { service } = createService();

      await expect(service.load()).resolves.toEqual(READING);
    });

    it('asks about the located position, rounded to about a kilometre', async () => {
      const { service, fetchJson } = createService();

      await service.load();

      const url = new URL(fetchJson.mock.calls[0]?.[0] ?? '');

      expect(url.searchParams.get('latitude')).toBe('25.04');
      expect(url.searchParams.get('longitude')).toBe('121.56');
    });

    it('gives up quietly when the browser will not say where we are', async () => {
      const { service, fetchJson } = createService({ coordinates: null });

      await expect(service.load()).resolves.toBeNull();
      expect(fetchJson).not.toHaveBeenCalled();
    });

    it('gives up quietly when the request fails', async () => {
      const { storage } = createFakeStorage();
      const service = createWeatherService({
        storage,
        fetchJson: async () => {
          throw new Error('offline');
        },
        locate: async () => COORDINATES,
        now: () => NOW,
      });

      await expect(service.load()).resolves.toBeNull();
    });

    it.each([
      ['no current block', { current: undefined }],
      ['no time zone', { timezone: 42 }],
      ['a temperature that is not a number', { current: { weather_code: 2 } }],
      ['an empty daily range', { daily: { temperature_2m_max: [] } }],
    ])('gives up quietly on a response with %s', async (_case, overrides) => {
      const { service } = createService({
        response: forecastResponse(overrides),
      });

      await expect(service.load()).resolves.toBeNull();
    });

    it('stores a reading it fetched', async () => {
      const { service, data } = createService();

      await service.load();

      expect(JSON.parse(data.get(WEATHER_STORAGE_KEY) ?? '')).toEqual({
        version: WEATHER_STORAGE_VERSION,
        fetchedAt: NOW,
        weather: READING,
      });
    });

    it('does not store a response it could not read', async () => {
      const { service, data } = createService({ response: { current: null } });

      await service.load();

      expect(data.has(WEATHER_STORAGE_KEY)).toBe(false);
    });

    it('serves a recent reading without locating or asking again', async () => {
      const { service, fetchJson, locate } = createService({
        stored: cachePayload(READING, NOW - WEATHER_MAX_AGE_MS + 1),
      });

      await expect(service.load()).resolves.toEqual(READING);
      expect(locate).not.toHaveBeenCalled();
      expect(fetchJson).not.toHaveBeenCalled();
    });

    it('fetches again once the stored reading has aged out', async () => {
      const { service, fetchJson } = createService({
        stored: cachePayload(READING, NOW - WEATHER_MAX_AGE_MS),
      });

      await service.load();

      expect(fetchJson).toHaveBeenCalledTimes(1);
    });
  });

  describe('cached', () => {
    it('has nothing to offer before anything is stored', () => {
      expect(createService().service.cached()).toBeNull();
    });

    it('offers a stored reading that is still current', () => {
      const { service } = createService({ stored: cachePayload() });

      expect(service.cached()).toEqual(READING);
    });

    it.each([
      ['it is not JSON', 'not json'],
      [
        'the version is one this build does not write',
        cachePayload(READING, NOW, 0),
      ],
      ['there is no timestamp', cachePayload(READING, 'yesterday')],
      ['the reading itself is malformed', cachePayload({ temperatureC: 26.5 })],
    ])('ignores a stored entry when %s', (_case, stored) => {
      const { service } = createService({ stored });

      expect(service.cached()).toBeNull();
    });
  });
});
