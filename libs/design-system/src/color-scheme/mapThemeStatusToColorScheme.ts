import { ColorScheme } from './ColorScheme';

/**
 * Determine which theme status correlates with which ColorScheme.
 */
export const mapThemeStatusToColorScheme = (themeStatus: string, preferredColorScheme: ColorScheme): ColorScheme => {
  switch (themeStatus) {
    case 'light':
      return 'light';
    case 'dark':
      return 'dark';
    default:
      return preferredColorScheme;
  }
};
