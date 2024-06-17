import { ColorScheme, useMantineColorScheme } from '@mantine/core';
import { IconOutlineDarkMode, IconOutlineLightMode, IconOutlineTonality } from '@novu/novui/icons';
import { ColorSchemePreferenceEnum, THEME_TITLE_LOOKUP, useLocalThemePreference } from '@novu/design-system';
import { useSegment } from '../components/providers/SegmentProvider';
import { useEffect, useMemo } from 'react';
import { useDebounce } from './useDebounce';

type ThemeChange = { colorScheme: ColorScheme; themeStatus: ColorSchemePreferenceEnum };

const getThemeIcon = (themeStatus: ColorSchemePreferenceEnum) => {
  if (themeStatus === ColorSchemePreferenceEnum.DARK) {
    return <IconOutlineDarkMode />;
  }
  if (themeStatus === ColorSchemePreferenceEnum.LIGHT) {
    return <IconOutlineLightMode />;
  }

  return <IconOutlineTonality />;
};

export default function useThemeChange() {
  const { themeStatus } = useLocalThemePreference();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
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
