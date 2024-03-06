import { useState, useEffect, useCallback } from 'react';
import { useLocalThemePreference } from '@novu/shared-web';
import { useColorScheme as useMantineColorScheme } from '@mantine/hooks';

export type ColorScheme = 'light' | 'dark';

const getColorSchemeFromThemeStatus = (themeStatus: string, preferredColorScheme: ColorScheme): ColorScheme => {
  switch (themeStatus) {
    case 'light':
      return 'light';
    case 'dark':
      return 'dark';
    default:
      return preferredColorScheme;
  }
};

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
    if (themeStatus === 'system') {
      setThemeStatus('light');
    } else if (themeStatus === 'light') {
      setThemeStatus('dark');
    } else {
      setThemeStatus('system');
    }
  };

  useEffect(() => {
    setColorScheme(getColorSchemeFromThemeStatus(themeStatus, preferredColorScheme));
  }, [themeStatus, preferredColorScheme, setColorScheme]);

  return {
    colorScheme,
    toggleColorScheme,
  };
};
