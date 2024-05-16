import { useState, useEffect, useCallback } from 'react';
import { useLocalThemePreference, ColorSchemePreferenceEnum } from '@novu/shared-web';
import { useColorScheme as useMantineColorScheme } from '@mantine/hooks';
import { ColorScheme } from './ColorScheme';
import { mapThemeStatusToColorScheme } from './mapThemeStatusToColorScheme';

/**
 * Handle behavior for changing ColorSchemes or ThemeStatuses
 */
export const useColorScheme = () => {
  const { themeStatus, setThemeStatus } = useLocalThemePreference();
  const preferredColorScheme = useMantineColorScheme();
  const [colorScheme, _setColorScheme] = useState<ColorScheme>(preferredColorScheme);

  const setColorScheme = useCallback(
    (newColorScheme: ColorScheme) => {
      // avoid issues with multiple `html` elements (like in Storybook)
      const htmlElements = document.querySelectorAll('html');
      const htmlElem = htmlElements.item(htmlElements.length - 1);

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
  };
};
