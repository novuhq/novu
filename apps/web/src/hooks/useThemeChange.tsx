import { ColorScheme, useMantineColorScheme } from '@mantine/core';
import { IconOutlineDarkMode, IconOutlineLightMode, IconOutlineTonality, IconType } from '@novu/novui/icons';
import { ColorSchemePreferenceEnum, THEME_TITLE_LOOKUP, useLocalThemePreference } from '@novu/design-system';
import { useEffect, useMemo } from 'react';
import { useSegment } from '../components/providers/SegmentProvider';
import { useDebounce } from './useDebounce';

type ThemeChange = { colorScheme: ColorScheme; themeStatus: ColorSchemePreferenceEnum };

export const ICON_BY_THEME_PREFERENCE: Record<ColorSchemePreferenceEnum, IconType> = {
  [ColorSchemePreferenceEnum.DARK]: IconOutlineDarkMode,
  [ColorSchemePreferenceEnum.LIGHT]: IconOutlineLightMode,
  [ColorSchemePreferenceEnum.SYSTEM]: IconOutlineTonality,
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

  const Icon = useMemo(
    () => ICON_BY_THEME_PREFERENCE[themeStatus] ?? ICON_BY_THEME_PREFERENCE[ColorSchemePreferenceEnum.SYSTEM],
    [themeStatus]
  );

  const themeLabel = THEME_TITLE_LOOKUP[themeStatus];

  return {
    Icon,
    colorScheme,
    themeLabel,
    toggleColorScheme,
  };
}
