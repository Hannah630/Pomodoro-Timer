import { queryElement } from './dom';

export interface AnnouncerView {
  /** Says something once, to whoever is listening rather than looking. */
  announce(message: string): void;
}

/**
 * The app's voice for assistive technology.
 *
 * Everything else that reports the end of a session needs something the user
 * may not have: the chime needs sound, the notification needs permission, and
 * the wash of colour needs eyes on the screen. A live region needs none of
 * them.
 *
 * The same text is written twice in a row when two sessions of the same kind
 * end back to back, and a live region ignores an unchanged value — so the
 * region is cleared first and filled on the next frame, which is what makes
 * the second one count as a change.
 */
export function createAnnouncerView(root: ParentNode): AnnouncerView {
  const region = queryElement(root, '[data-announce]');

  return {
    announce(message) {
      region.textContent = '';

      requestAnimationFrame(() => {
        region.textContent = message;
      });
    },
  };
}
