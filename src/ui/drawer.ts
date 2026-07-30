export interface Drawer {
  isOpen(): boolean;
  open(): void;
  close(): void;
}

export interface DrawerConfig {
  toggle: HTMLButtonElement;
  panel: HTMLElement;
  /** Class put on the root while this drawer is open, for CSS to slide it. */
  openClass: string;
  onClose?: () => void;
}

export interface DrawerGroup {
  add(config: DrawerConfig): Drawer;
}

/**
 * Sliding panels that share one scrim and one edge of the screen.
 *
 * A <details> element cannot do this: its body is display:none while closed,
 * so there is nothing to slide. That means re-adding by hand everything
 * details gives for free — aria-expanded, Escape, click away, focus moved in
 * and back, and inert while shut so focus cannot land on a panel that is off
 * screen. Written once here rather than once per panel.
 */
export function createDrawerGroup(scrim: HTMLElement): DrawerGroup {
  const drawers: Drawer[] = [];

  function closeAll(): void {
    drawers.forEach((drawer) => drawer.close());
  }

  scrim.addEventListener('click', closeAll);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeAll();
    }
  });

  return {
    add({ toggle, panel, openClass, onClose }) {
      let open = false;

      function apply(): void {
        document.documentElement.classList.toggle(openClass, open);
        toggle.setAttribute('aria-expanded', String(open));
      }

      const drawer: Drawer = {
        isOpen: () => open,

        open() {
          if (open) {
            return;
          }

          // One at a time: two panels sliding onto the same edge would sit on
          // top of each other.
          closeAll();

          open = true;
          panel.removeAttribute('inert');
          apply();
          panel.focus();
        },

        close() {
          if (!open) {
            return;
          }

          // Only take focus back if it is inside the panel about to be hidden,
          // so closing one drawer never steals focus from elsewhere.
          const shouldRestoreFocus = panel.contains(document.activeElement);

          open = false;
          panel.setAttribute('inert', '');
          apply();
          onClose?.();

          if (shouldRestoreFocus) {
            toggle.focus();
          }
        },
      };

      toggle.addEventListener('click', () => {
        if (open) {
          drawer.close();
          toggle.focus();
        } else {
          drawer.open();
        }
      });

      drawers.push(drawer);

      return drawer;
    },
  };
}
