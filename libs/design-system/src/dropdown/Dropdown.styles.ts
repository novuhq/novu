import { createStyles, MantineTheme } from '@mantine/core';
import { colors, shadows } from '../config';

export default createStyles((theme: MantineTheme) => {
  const dark = theme.colorScheme === 'dark';

  return {
    arrow: {
      width: '7px',
      height: '7px',
      backgroundColor: dark ? colors.B20 : colors.white,
      border: 'none',
    },
    dropdown: {
      backgroundColor: dark ? colors.B20 : colors.white,
      color: dark ? theme.white : colors.B40,
      border: 'none',
      boxShadow: shadows.dark,
    },
    item: {
      borerRadius: '5px',
      color: `${dark ? theme.white : colors.B40} !important`,
      fontWeight: 400,
      fontSize: '14px',
      ['&[data-critical]']: { '&:hover': { color: `${colors.error} !important` } },
    },
    itemHovered: {
      backgroundColor: dark ? colors.B30 : colors.B98,
    },
    divider: {
      margin: '10px',
      borderTop: `0.0625rem solid ${dark ? colors.B30 : colors.BGLight}`,
    },
  };
});
