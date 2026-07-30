import type { TimerMode } from '../models/timer.model';
import { MAX_TITLE_LENGTH } from '../services/session.service';
import { queryElement } from './dom';

export interface TitleHandlers {
  onTitleChange(raw: string): void;
}

export interface TitleView {
  /** Shows the field for focus sessions and hides it for breaks. */
  render(mode: TimerMode): void;

  /** Writes the stored title back, after trimming or capping. */
  setValue(title: string): void;
}

/**
 * The field naming the current task.
 *
 * Visibility and value are separate methods on purpose. Visibility follows
 * every state change, four times a second while running; the value is only
 * written when the service has accepted one. Doing both in one render would
 * overwrite whatever the user was in the middle of typing.
 */
export function createTitleView(
  root: ParentNode,
  handlers: TitleHandlers,
): TitleView {
  const input = queryElement<HTMLInputElement>(root, '[data-title]');

  // Sourced from the service so the limit is stated in exactly one place.
  input.maxLength = MAX_TITLE_LENGTH;

  input.addEventListener('change', () => {
    handlers.onTitleChange(input.value);
  });

  return {
    render(mode) {
      input.hidden = mode !== 'focus';
    },

    setValue(title) {
      input.value = title;
    },
  };
}
