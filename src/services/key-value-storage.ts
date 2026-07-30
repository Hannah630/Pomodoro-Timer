/**
 * Only the part of the Storage API this app uses.
 *
 * Depending on this rather than on Storage keeps the storage services testable
 * without a browser, and states exactly what they need. Both the settings
 * store and the history store speak it.
 */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
