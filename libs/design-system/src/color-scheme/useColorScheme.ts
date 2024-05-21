import { useState, useEffect, useCallback } from 'react';
import { useLocalThemePreference, ColorSchemePreferenceEnum } from '@novu/shared-web';
import { ColorScheme } from './ColorScheme';
import { mapThemeStatusToColorScheme } from './mapThemeStatusToColorScheme';
import { getColorSchemeHtmlElement } from './getColorSchemeHtmlElement';
import { getBrowserColorScheme } from './getColorScheme';

/**
 * Handle behavior for changing ColorSchemes or ThemeStatuses
 */
export const useColorScheme = () => {
  const { themeStatus, setThemeStatus } = useLocalThemePreference();
  const [colorScheme, _setColorScheme] = useState<ColorScheme>(getBrowserColorScheme());

  const setColorScheme = useCallback(
    (newColorScheme: ColorScheme) => {
      const htmlElem = getColorSchemeHtmlElement();
      if (!htmlElem) {
        return;
      }

      htmlElem.className = newColorScheme;
      _setColorScheme(newColorScheme);
    },
    [_setColorScheme]
  );

  const toggleColorScheme = useCallback(() => {
    setThemeStatus((prevThemeStatus) => {
      switch (prevThemeStatus) {
        case ColorSchemePreferenceEnum.SYSTEM:
          return ColorSchemePreferenceEnum.LIGHT;
        case ColorSchemePreferenceEnum.LIGHT:
          return ColorSchemePreferenceEnum.DARK;
        default:
          return ColorSchemePreferenceEnum.SYSTEM;
      }
    });
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    setColorScheme(mapThemeStatusToColorScheme(themeStatus));
  }, [themeStatus, setColorScheme]);

  return {
    themeStatus,
    colorScheme,
    toggleColorScheme,
  };
};
