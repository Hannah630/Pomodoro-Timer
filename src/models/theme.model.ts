/**
 * Which colour scheme the interface uses.
 *
 * Three values rather than a boolean, because "follow the system" is a real
 * answer and not the absence of one: a page that merely defaults to the
 * system preference cannot tell that apart from someone who wants light
 * everywhere and happens to be on a light machine today.
 */
export type Theme = 'system' | 'light' | 'dark';

/** What `system` becomes once the system has actually been asked. */
export type ResolvedTheme = Exclude<Theme, 'system'>;

/** Every legal value, for the code that has to check one it was handed. */
export const THEMES: readonly Theme[] = ['system', 'light', 'dark'];

/**
 * Following the system, which is the answer that needs no explaining to
 * someone who has already set a preference for everything else they use.
 */
export const DEFAULT_THEME: Theme = 'system';
