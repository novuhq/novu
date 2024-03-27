import { useMantineTheme } from '@mantine/core';
import React from 'react';

export function useIsDarkTheme() {
  const { colorScheme } = useMantineTheme();
  const isDark = colorScheme === 'dark';

  return isDark;
}
