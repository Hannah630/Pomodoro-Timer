import type { Weather } from '../models/weather.model';
import { queryElement } from './dom';
import { formatWeather } from './weather-format';

/**
 * What the line can be showing.
 *
 * A union rather than a weather-or-null, because "asking" and "cannot say" are
 * different sentences and a null would have to stand for both.
 */
export type WeatherState =
  | { readonly status: 'locating' }
  | { readonly status: 'ready'; readonly weather: Weather }
  | { readonly status: 'unavailable' };

export interface WeatherView {
  render(state: WeatherState): void;
}

/**
 * One line of weather at the foot of the settings drawer.
 *
 * In a drawer rather than beside the clock on purpose. This app pauses a focus
 * session the moment the user looks away; putting something that changes on
 * its own next to the countdown would be spending on distraction what the rest
 * of it spends protecting.
 *
 * Failure is stated rather than hidden. An empty line where a reading was
 * expected reads as broken, and "unavailable" is the honest word for a
 * permission that was refused, a network that is not there, and a forecast
 * that came back in a shape this does not know.
 */
export function createWeatherView(root: ParentNode): WeatherView {
  const line = queryElement(root, '[data-weather]');

  return {
    render(state) {
      line.textContent = describe(state);
    },
  };
}

function describe(state: WeatherState): string {
  switch (state.status) {
    case 'locating':
      return 'Locating…';
    case 'ready':
      return formatWeather(state.weather);
    case 'unavailable':
      return 'Weather unavailable';
  }
}
