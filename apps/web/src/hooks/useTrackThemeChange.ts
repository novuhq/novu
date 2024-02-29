import { ColorScheme, useMantineColorScheme } from '@mantine/core';
import { useLocalThemePreference, useSegment } from '@novu/shared-web';
import { useEffect } from 'react';
import { useDebounce } from './useDebounce';

type ThemeChange = { colorScheme: ColorScheme; themeStatus: string };

export default function useTrackThemeChange() {
  const { themeStatus } = useLocalThemePreference();
  const { colorScheme } = useMantineColorScheme();

  const segment = useSegment();

  const trackThemeChange = useDebounce<ThemeChange>((args) => {
    segment.track('Theme is set - [Theme]', args);
  }, 500);

  useEffect(() => {
    trackThemeChange({ colorScheme, themeStatus });
  }, [colorScheme, themeStatus, trackThemeChange]);
}
