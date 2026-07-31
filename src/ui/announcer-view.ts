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
 * region is cleared first and refilled a turn later, which is what makes the
 * second one register as a change.
 *
 * That turn is a timeout rather than an animation frame for the same reason
 * the tick scheduler keeps a slow clock beside its fast one: frames stop
 * entirely while the tab is hidden, and a session can finish while it is.
 * The announcement would sit unwritten until the user came back and looked,
 * which of all the ways to fail is the wrong one for the channel that exists
 * for people who are not looking.
 */
export function createAnnouncerView(root: ParentNode): AnnouncerView {
  const region = queryElement(root, '[data-announce]');

  return {
    announce(message) {
      region.textContent = '';

      window.setTimeout(() => {
        region.textContent = message;
      }, 0);
    },
  };
}
