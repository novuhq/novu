import { createStyles, MantineTheme } from '@mantine/core';
import { colors } from '../config';

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
      minWidth: 220,
      backgroundColor: dark ? colors.B20 : colors.white,
      color: dark ? theme.white : colors.B40,
      border: 'none',
    },
    item: {
      borerRadius: '5px',
      color: `${dark ? theme.white : colors.B40} !important`,
      fontWeight: 400,
      fontSize: '14px',
    },
    itemHovered: {
      backgroundColor: dark ? colors.B30 : colors.B98,
    },
  };
});
