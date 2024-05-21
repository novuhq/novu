import { ColorSchemePreferenceEnum } from '@novu/shared-web';
import { ColorScheme } from './ColorScheme';
import { getBrowserColorScheme } from './getColorScheme';

const COLOR_SCHEME_PREFERENCE_TO_COLOR_SCHEME_MAP: Record<ColorSchemePreferenceEnum, ColorScheme | null> = {
  [ColorSchemePreferenceEnum.LIGHT]: 'light',
  [ColorSchemePreferenceEnum.DARK]: 'dark',
  [ColorSchemePreferenceEnum.SYSTEM]: null,
};

/**
 * Determine which theme status correlates with which ColorScheme.
 */
export const mapThemeStatusToColorScheme = (themeStatus: ColorSchemePreferenceEnum): ColorScheme => {
  return COLOR_SCHEME_PREFERENCE_TO_COLOR_SCHEME_MAP[themeStatus] ?? getBrowserColorScheme();
};
