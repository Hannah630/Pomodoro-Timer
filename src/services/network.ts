/**
 * Fetches a URL and hands back whatever JSON it held.
 *
 * The return type is unknown on purpose: this is the boundary of the app, and
 * a third party's response is not a shape TypeScript can vouch for. Whoever
 * asked for it does the narrowing.
 */
export type FetchJson = (url: string) => Promise<unknown>;

/**
 * The browser's fetch, behind the port above.
 *
 * A non-2xx response throws rather than returning its body: an error page is
 * not a forecast, and letting it through would mean every caller checking for
 * the same thing.
 *
 * No spec — like geolocation.service, there is nothing here but the call.
 */
export const fetchJson: FetchJson = async (url) => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }

  return response.json();
};
