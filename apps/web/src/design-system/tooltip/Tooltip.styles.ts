import { createStyles, MantineTheme } from '@mantine/core';
import { colors, shadows } from '../config';

export default createStyles((theme: MantineTheme) => {
  const dark = theme.colorScheme === 'dark';

  return {
    tooltip: {
      backgroundColor: dark ? colors.B20 : theme.white,
      color: colors.B60,
      boxShadow: dark ? shadows.dark : shadows.medium,
      padding: '12px 15px',
      fontSize: '14px',
      fontWeight: 400,
    },
    arrow: {
      backgroundColor: dark ? colors.B20 : theme.white,
    },
  };
});
