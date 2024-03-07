import { createStyles } from '@mantine/core';

import { colors } from '../config';

export default createStyles(({ colorScheme }) => ({
  dropdown: {
    padding: '16px',
    backgroundColor: colorScheme === 'dark' ? colors.B20 : colors.white,
    color: colors.B60,
    border: 'none',
  },
  arrow: {
    backgroundColor: colorScheme === 'dark' ? colors.B20 : colors.white,
    height: '7px',
    border: 'none',
    margin: '0px',
  },
}));
