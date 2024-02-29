import { ColorScheme } from '@mantine/core';
import { useLocalThemePreference, useSegment } from '@novu/shared-web';
import { useEffect } from 'react';
import { useDebounce } from './useDebounce';

type ThemeChangeProps = { colorScheme: ColorScheme };

export default function useTrackThemeChange({ colorScheme }: ThemeChangeProps) {
  const { themeStatus } = useLocalThemePreference();

  const segment = useSegment();

  const trackThemeChange = useDebounce<ThemeChangeProps>((args) => {
    segment.track('Theme is set - [Theme]', args);
  }, 500);

  useEffect(() => {
    trackThemeChange({ colorScheme, themeStatus });
  }, [colorScheme, themeStatus, trackThemeChange]);
}
