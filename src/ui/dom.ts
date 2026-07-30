/**
 * Looks up an element that the markup is expected to contain.
 *
 * Views are written against index.html, so a missing element is a bug in the
 * markup rather than a case to handle at runtime. Failing loudly here beats
 * a silent null check in every view.
 */
export function queryElement<T extends HTMLElement = HTMLElement>(
  root: ParentNode,
  selector: string,
): T {
  const element = root.querySelector<T>(selector);

  if (!element) {
    throw new Error(`Expected markup to contain an element matching ${selector}`);
  }

  return element;
}
