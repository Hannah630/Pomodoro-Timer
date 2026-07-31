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

  // Only where there is a real pointer. On a phone, blur fires for the address
  // bar collapsing, the keyboard opening and the switch into fullscreen, none
  // of which mean the user left — and leaving for another app there raises
  // visibilitychange anyway, so blur adds nothing but false alarms.
  if (window.matchMedia('(pointer: fine)').matches) {
    window.addEventListener('blur', onLeave);
  }
}

/**
 * Fills the screen with the timer. Must be called from a user gesture.
 *
 * Fullscreen is a nicety, and not every browser offers it on an ordinary
 * element — iOS Safari allows it only on a video. Calling a method that is not
 * there throws straight away, where a rejected promise would have been caught,
 * and that exception would take the rest of the click handler with it.
 */
export function enterFullscreen(): void {
  const root = document.documentElement;

  if (
    document.fullscreenElement ||
    typeof root.requestFullscreen !== 'function'
  ) {
    return;
  }

  void root.requestFullscreen().catch(() => undefined);
}

/** Leaving needs no gesture, so this can run when a session ends. */
export function exitFullscreen(): void {
  if (
    !document.fullscreenElement ||
    typeof document.exitFullscreen !== 'function'
  ) {
    return;
  }

  void document.exitFullscreen().catch(() => undefined);
}
