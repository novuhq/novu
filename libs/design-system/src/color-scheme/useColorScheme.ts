import { useState, useEffect, useCallback } from 'react';
import { useColorScheme as useMantineColorScheme } from '@mantine/hooks';
import { useLocalThemePreference, ColorSchemePreferenceEnum } from '../hooks/useLocalThemePreference';
import { ColorScheme } from './ColorScheme';
import { mapThemeStatusToColorScheme } from './mapThemeStatusToColorScheme';
import { getColorSchemeHtmlElement } from './getColorSchemeHtmlElement';

/**
 * Handle behavior for changing ColorSchemes or ThemeStatuses.
 *
 * NOTE: This is not intended for getting the color scheme in application code:
 * - For styling with Panda, use _dark or _light to create CSS targeted at a specific color scheme.
 */
export const useColorScheme = () => {
  const { themeStatus, setThemeStatus } = useLocalThemePreference();
  const preferredColorScheme = useMantineColorScheme();
  const [colorScheme, _setColorScheme] = useState<ColorScheme>(preferredColorScheme);

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

  const toggleColorScheme = () => {
    switch (themeStatus) {
      case ColorSchemePreferenceEnum.SYSTEM:
        setThemeStatus(ColorSchemePreferenceEnum.LIGHT);
        break;
      case ColorSchemePreferenceEnum.LIGHT:
        setThemeStatus(ColorSchemePreferenceEnum.DARK);
        break;
      default:
        setThemeStatus(ColorSchemePreferenceEnum.SYSTEM);
        break;
    }
  };

  useEffect(() => {
    setColorScheme(mapThemeStatusToColorScheme(themeStatus, preferredColorScheme));
  }, [themeStatus, preferredColorScheme, setColorScheme]);

  return {
    colorScheme,
    toggleColorScheme,
    setColorScheme,
  };
};
