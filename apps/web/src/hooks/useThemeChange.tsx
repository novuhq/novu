import { ColorScheme, IconDarkMode, IconLightMode, IconTonality, useColorScheme } from '@novu/design-system';
import { ColorSchemePreferenceEnum, THEME_TITLE_LOOKUP, useSegment } from '@novu/shared-web';
import { useEffect, useMemo } from 'react';
import { useDebounce } from './useDebounce';

type ThemeChange = { colorScheme: ColorScheme; themeStatus: ColorSchemePreferenceEnum };

const getThemeIcon = (themeStatus: ColorSchemePreferenceEnum) => {
  if (themeStatus === ColorSchemePreferenceEnum.DARK) {
    return <IconDarkMode />;
  }
  if (themeStatus === ColorSchemePreferenceEnum.LIGHT) {
    return <IconLightMode />;
  }

  return <IconTonality />;
};

export default function useThemeChange() {
  const { colorScheme, toggleColorScheme, themeStatus } = useColorScheme();
  const segment = useSegment();

  const trackThemeChange = useDebounce<ThemeChange>((args) => {
    segment.track('Theme is set - [Theme]', args);
  }, 500);

  useEffect(() => {
    trackThemeChange({ colorScheme, themeStatus });
  }, [colorScheme, themeStatus, trackThemeChange]);

  const themeIcon = useMemo(() => getThemeIcon(themeStatus), [themeStatus]);

  const themeLabel = THEME_TITLE_LOOKUP[themeStatus];

  return {
    themeIcon,
    themeLabel,
    toggleColorScheme,
  };
}
