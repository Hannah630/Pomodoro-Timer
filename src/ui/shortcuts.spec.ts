import { describe, expect, it } from 'vitest';

import { resolveShortcut, type ShortcutContext } from './shortcuts';

function press(overrides: Partial<ShortcutContext> = {}): ShortcutContext {
  return {
    key: ' ',
    isEditable: false,
    isButton: false,
    isModalOpen: false,
    hasModifier: false,
    ...overrides,
  };
}

describe('resolveShortcut', () => {
  it('reads Space as the primary action', () => {
    expect(resolveShortcut(press({ key: ' ' }))).toBe('primary');
    expect(resolveShortcut(press({ key: 'Spacebar' }))).toBe('primary');
  });

  it('reads R as reset, in either case', () => {
    expect(resolveShortcut(press({ key: 'r' }))).toBe('reset');
    expect(resolveShortcut(press({ key: 'R' }))).toBe('reset');
  });

  it('ignores a key that means nothing here', () => {
    expect(resolveShortcut(press({ key: 'k' }))).toBeNull();
    expect(resolveShortcut(press({ key: 'Enter' }))).toBeNull();
  });

  // Typing "start the report" in the task field would otherwise start, stop
  // and reset the timer on the way through.
  it('stands aside while something is being typed into', () => {
    expect(resolveShortcut(press({ key: ' ', isEditable: true }))).toBeNull();
    expect(resolveShortcut(press({ key: 'r', isEditable: true }))).toBeNull();
  });

  // A focused button already answers to Space. Handling it here as well would
  // start and immediately pause the timer on a single press.
  it('leaves a focused button to answer for itself', () => {
    expect(resolveShortcut(press({ key: ' ', isButton: true }))).toBeNull();
  });

  it('does nothing while a drawer covers the timer', () => {
    expect(resolveShortcut(press({ key: ' ', isModalOpen: true }))).toBeNull();
    expect(resolveShortcut(press({ key: 'r', isModalOpen: true }))).toBeNull();
  });

  // Ctrl-R is reload. Taking it would be taking it from the browser.
  it('never claims a combination that belongs to the browser', () => {
    expect(resolveShortcut(press({ key: 'r', hasModifier: true }))).toBeNull();
    expect(resolveShortcut(press({ key: ' ', hasModifier: true }))).toBeNull();
  });
});
