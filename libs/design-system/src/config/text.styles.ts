import { createStyles, MantineTheme } from '@mantine/core';
import { colors } from './colors';

export const useTextStyles = createStyles((theme: MantineTheme) => {
  const dark = theme.colorScheme === 'dark';

  const primaryColor = dark ? theme.white : theme.colors.gray[8];

  return {
    heading: {
      color: dark ? theme.white : colors.B40,
    },
    subHeading: {
      color: dark ? colors.B40 : primaryColor,
    },
    separator: {
      borderTopColor: dark ? colors.B20 : colors.BGLight,
      margin: '24px 0',
    },
  };
});
