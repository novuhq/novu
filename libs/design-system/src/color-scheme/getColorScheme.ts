import { ColorScheme } from './ColorScheme';
import { getColorSchemeHtmlElement } from './getColorSchemeHtmlElement';

const DEFAULT_COLOR_SCHEME: ColorScheme = 'light';

/**
 * Gets the user's preferred color scheme according to their browser settings.
 * @returns ColorScheme
 */
export const getBrowserColorScheme = (): ColorScheme => {
  return window?.matchMedia?.(`(prefers-color-scheme: dark)`)?.matches ? 'dark' : DEFAULT_COLOR_SCHEME;
};

/**
 * Get the current color scheme of the application based on the application html.
 * @returns ColorScheme
 */
export const getCurrentColorScheme = (): ColorScheme => {
  const htmlElem = getColorSchemeHtmlElement();

  // fallback to browser preferences if there isn't an html element
  if (!htmlElem?.classList) {
    return getBrowserColorScheme();
  }

  // eslint-disable-next-line no-nested-ternary
  return htmlElem.classList.contains('dark')
    ? 'dark'
    : htmlElem.classList.contains('light')
      ? 'light'
      : DEFAULT_COLOR_SCHEME;
};
