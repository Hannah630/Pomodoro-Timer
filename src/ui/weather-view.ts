import type { Weather } from '../models/weather.model';
import { queryElement } from './dom';
import { formatWeather } from './weather-format';

export interface WeatherView {
  /** Shows a reading, or nothing at all when there is none. */
  render(weather: Weather | null): void;
}

/**
 * One line of weather above the dial.
 *
 * Null renders as an empty line rather than as a message. In a panel someone
 * opened to look at the weather, "unavailable" is the honest answer; sitting
 * permanently above a countdown, on a device that will never give a position,
 * it is a complaint the user can do nothing about. The reserved line in CSS is
 * what lets it say nothing without moving the instrument.
 */
export function createWeatherView(root: ParentNode): WeatherView {
  const line = queryElement(root, '[data-weather]');

  return {
    render(weather) {
      line.textContent = weather === null ? '' : formatWeather(weather);
    },
  };
}
