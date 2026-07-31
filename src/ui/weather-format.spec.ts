import { describe, expect, it } from 'vitest';

import type { Weather } from '../models/weather.model';
import {
  describeWeather,
  formatWeather,
  placeFromTimeZone,
} from './weather-format';

function createWeather(overrides: Partial<Weather> = {}): Weather {
  return {
    temperatureC: 26.5,
    highC: 35,
    lowC: 26.2,
    code: 2,
    timeZone: 'Asia/Taipei',
    ...overrides,
  };
}

describe('describeWeather', () => {
  it('puts a code into words', () => {
    expect(describeWeather(0)).toBe('Clear');
    expect(describeWeather(95)).toBe('Thunderstorm');
  });

  it('still says something for a code it does not know', () => {
    expect(describeWeather(4)).toBe('Unsettled');
  });
});

describe('placeFromTimeZone', () => {
  it('takes the city off the end of the zone', () => {
    expect(placeFromTimeZone('Asia/Taipei')).toBe('Taipei');
  });

  it('reads underscores as the spaces they stand in for', () => {
    expect(placeFromTimeZone('America/New_York')).toBe('New York');
  });

  it('keeps the deepest name when a zone has three parts', () => {
    expect(placeFromTimeZone('America/Indiana/Knox')).toBe('Knox');
  });

  it('passes through a zone with no city in it', () => {
    expect(placeFromTimeZone('UTC')).toBe('UTC');
  });
});

describe('formatWeather', () => {
  it('reads as one line: where, now, today, and in a word', () => {
    expect(formatWeather(createWeather())).toBe(
      'Taipei · 27° · 26–35° · Partly cloudy',
    );
  });

  it('rounds to whole degrees', () => {
    expect(
      formatWeather(
        createWeather({ temperatureC: -3.5, lowC: -4.2, highC: 0.4 }),
      ),
    ).toBe('Taipei · -3° · -4–0° · Partly cloudy');
  });

  it('never writes a negative zero', () => {
    expect(formatWeather(createWeather({ temperatureC: -0.4 }))).toContain(
      '· 0° ·',
    );
  });

  it('drops the place rather than leaving a gap when there is no zone', () => {
    expect(formatWeather(createWeather({ timeZone: '' }))).toBe(
      '27° · 26–35° · Partly cloudy',
    );
  });
});
