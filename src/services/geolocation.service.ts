import type { Coordinates } from '../models/weather.model';

/** How long to wait for a fix before giving up on one. */
const LOCATE_TIMEOUT_MS = 10_000;

/**
 * A position is good for as long as a reading is, so a fix taken for the last
 * request can be handed straight back for this one.
 */
const POSITION_MAX_AGE_MS = 30 * 60 * 1000;

export interface GeolocationService {
  /**
   * Whether permission was granted on an earlier visit.
   *
   * Asked so that a returning user gets the weather without being prompted,
   * and a new one is not prompted the instant the page opens.
   */
  isAlreadyGranted(): Promise<boolean>;

  /** A fix, or null if the browser will not give one. */
  locate(): Promise<Coordinates | null>;
}

/**
 * The browser's location, with every way it can decline folded into null.
 *
 * Refusing is the ordinary case here, not the exceptional one: the API is
 * missing over plain HTTP, the permission can be denied, and a device with no
 * fix simply times out. None of them is worth an error the caller has to
 * handle separately — there is either a position or there is not.
 *
 * No spec, for the same reason notification.service has none: everything here
 * is a call into a browser API, and a test would assert that the calls written
 * are the calls written.
 */
export function createGeolocationService(): GeolocationService {
  return {
    async isAlreadyGranted() {
      try {
        // Safari has no permissions.query for geolocation. Not knowing is
        // treated as not granted, which costs a returning Safari user one
        // prompt on the drawer rather than a broken page.
        const permission = await navigator.permissions?.query({
          name: 'geolocation',
        });

        return permission?.state === 'granted';
      } catch {
        return false;
      }
    },

    locate() {
      return new Promise<Coordinates | null>((resolve) => {
        if (!navigator.geolocation) {
          resolve(null);
          return;
        }

        navigator.geolocation.getCurrentPosition(
          ({ coords }) =>
            resolve({
              latitude: coords.latitude,
              longitude: coords.longitude,
            }),
          () => resolve(null),
          {
            // A city's weather does not change across a street, and the
            // low-accuracy fix is the one that does not wake the GPS.
            enableHighAccuracy: false,
            timeout: LOCATE_TIMEOUT_MS,
            maximumAge: POSITION_MAX_AGE_MS,
          },
        );
      });
    },
  };
}
