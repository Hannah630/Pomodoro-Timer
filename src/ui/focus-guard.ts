/**
 * Keeping a focus session honest.
 *
 * A web page cannot stop anyone opening another app, and no browser will ever
 * let it: a page that could lock you out of your machine is ransomware. What
 * it can do is refuse to count time spent elsewhere, and clear the screen of
 * everything but the timer while the session runs.
 */

/**
 * Calls back when the user's attention leaves the page.
 *
 * Two events, because they catch different things. visibilitychange fires when
 * the tab is hidden; switching to another window on the same screen often
 * leaves the tab visible but unfocused, which only blur reports. Blur also
 * fires for the address bar and the developer tools, so the caller decides
 * whether leaving is worth acting on.
 */
export function watchForLeaving(onLeave: () => void): void {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      onLeave();
    }
  });

  window.addEventListener('blur', onLeave);
}

/**
 * Fills the screen with the timer. Must be called from a user gesture, and
 * fails quietly: fullscreen is a nicety, not something to break a start over.
 */
export function enterFullscreen(): void {
  if (!document.fullscreenElement) {
    void document.documentElement.requestFullscreen().catch(() => undefined);
  }
}

/** Leaving needs no gesture, so this can run when a session ends. */
export function exitFullscreen(): void {
  if (document.fullscreenElement) {
    void document.exitFullscreen().catch(() => undefined);
  }
}
