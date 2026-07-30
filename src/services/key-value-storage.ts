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

/**
 * Reads a key, treating a refusal as an empty slot.
 *
 * Storage can be blocked outright — private browsing, cookies disabled — and
 * then even reading throws. Left unguarded that happens while the modules are
 * still loading, which takes the whole app down before a single event handler
 * is attached. Starting fresh beats not starting.
 */
export function readItem(storage: KeyValueStorage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Writes a key, treating a refusal as nothing worth interrupting for.
 *
 * Storage can also be full. Losing a save is not a reason to break a running
 * timer.
 */
export function writeItem(
  storage: KeyValueStorage,
  key: string,
  value: string,
): void {
  try {
    storage.setItem(key, value);
  } catch {
    // Nothing to do about it, and nothing worth telling the user.
  }
}
