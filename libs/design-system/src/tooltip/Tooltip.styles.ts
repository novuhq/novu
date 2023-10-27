import { createStyles, MantineTheme } from '@mantine/core';
import { colors, shadows } from '../config';
import { getGradient } from '../config/helper';

export default createStyles((theme: MantineTheme, { error }: { error: boolean }) => {
  const dark = theme.colorScheme === 'dark';
  const opacityErrorColor = theme.fn.rgba(colors.error, 0.2);
  const errorGradient = getGradient(opacityErrorColor);
  const backgroundErrorColor = dark ? colors.B17 : colors.white;
  const backgroundColor = dark ? colors.B20 : colors.white;
  const background = error ? `${errorGradient}, ${backgroundErrorColor}` : backgroundColor;
  const color = error ? colors.error : colors.B60;

  return {
    tooltip: {
      background,
      color,
      boxShadow: dark ? shadows.dark : shadows.medium,
      padding: '12px 15px',
      fontSize: '14px',
      fontWeight: 400,
    },
    arrow: {
      background,
    },
  };
});
