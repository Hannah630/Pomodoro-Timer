import type { ResolvedTheme, Theme } from '../models/theme.model';
import { queryElement } from './dom';

const THEME_BUTTONS: ReadonlyArray<{ selector: string; theme: Theme }> = [
  { selector: '[data-theme-system]', theme: 'system' },
  { selector: '[data-theme-light]', theme: 'light' },
  { selector: '[data-theme-dark]', theme: 'dark' },
];

export interface ThemeHandlers {
  onSelect(theme: Theme): void;
}

export interface ThemeView {
  render(chosen: Theme, resolved: ResolvedTheme): void;
}

/**
 * The colour scheme, in the two places it shows.
 *
 * One view for both, because they are one fact seen twice: the attribute on
 * the root that the stylesheet reads, and the pressed button that says which
 * choice put it there. Split across two views they would be two things to
 * remember to call.
 *
 * The attribute is the whole of the styling done here. Which colours a theme
 * means is the stylesheet's business, exactly as it is for `--mode`; this
 * only says which one is in force.
 */
export function createThemeView(
  root: ParentNode,
  handlers: ThemeHandlers,
): ThemeView {
  const documentRoot = document.documentElement;

  const buttons = THEME_BUTTONS.map(({ selector, theme }) => {
    const button = queryElement<HTMLButtonElement>(root, selector);

    button.addEventListener('click', () => handlers.onSelect(theme));

    return { button, theme };
  });

  return {
    render(chosen, resolved) {
      documentRoot.dataset['theme'] = resolved;

      buttons.forEach(({ button, theme }) => {
        const isActive = theme === chosen;

        button.classList.toggle('mode--active', isActive);
        // The chosen value, not the resolved one: with `system` in effect the
        // button that should read as pressed is System, whichever scheme the
        // machine happens to be asking for.
        button.setAttribute('aria-pressed', String(isActive));
      });
    },
  };
}
