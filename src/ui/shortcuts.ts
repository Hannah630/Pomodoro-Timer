export type ShortcutAction = 'primary' | 'reset';

export interface ShortcutContext {
  readonly key: string;
  /** Focus is in a text field, a number field or anything else being typed into. */
  readonly isEditable: boolean;
  /** Focus is on a button, which already answers to Space and Enter itself. */
  readonly isButton: boolean;
  /** A drawer is open, so the timer is behind a modal. */
  readonly isModalOpen: boolean;
  readonly hasModifier: boolean;
}

export interface ShortcutHandlers {
  onPrimary(): void;
  onReset(): void;
}

/**
 * Which action a key press stands for, or null for one that should be left
 * alone.
 *
 * Knowing when *not* to fire is the whole of this rule, so it lives in a
 * function that takes plain data and can be tested without a browser. Four
 * separate reasons to stand aside:
 *
 * - typing "reset" in the task field must not reset anything
 * - a focused button already responds to Space; handling it here as well
 *   would toggle the timer twice on one press
 * - a drawer is a modal, and shortcuts have no business firing underneath one
 * - Ctrl-R is the browser's reload and stays the browser's
 */
export function resolveShortcut(
  context: ShortcutContext,
): ShortcutAction | null {
  if (
    context.isEditable ||
    context.isButton ||
    context.isModalOpen ||
    context.hasModifier
  ) {
    return null;
  }

  // "Spacebar" is what older browsers report; it costs one comparison to
  // keep them working.
  if (context.key === ' ' || context.key === 'Spacebar') {
    return 'primary';
  }

  if (context.key === 'r' || context.key === 'R') {
    return 'reset';
  }

  return null;
}

/**
 * Listens for the shortcuts and forwards them.
 *
 * It forwards rather than decides: what the primary action means at this
 * moment is already settled in the controls view, and a second copy of
 * "running means pause" would be one to keep in step.
 */
export function watchForShortcuts(
  handlers: ShortcutHandlers,
  isModalOpen: () => boolean,
): void {
  document.addEventListener('keydown', (event) => {
    const action = resolveShortcut({
      key: event.key,
      isEditable: isEditable(document.activeElement),
      isButton: isButton(document.activeElement),
      isModalOpen: isModalOpen(),
      hasModifier: event.ctrlKey || event.altKey || event.metaKey,
    });

    if (action === null) {
      return;
    }

    // Space scrolls the page by default, which would jump the layout every
    // time the timer is started from the keyboard.
    event.preventDefault();

    if (action === 'primary') {
      handlers.onPrimary();
    } else {
      handlers.onReset();
    }
  });
}

const EDITABLE_TAGS = ['INPUT', 'TEXTAREA', 'SELECT'];

function isEditable(element: Element | null): boolean {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  return EDITABLE_TAGS.includes(element.tagName) || element.isContentEditable;
}

function isButton(element: Element | null): boolean {
  return element !== null && element.tagName === 'BUTTON';
}
