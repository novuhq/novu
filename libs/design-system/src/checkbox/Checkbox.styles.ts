import { createStyles, MantineTheme } from '@mantine/core';
import { colors } from '../config';

export default createStyles<string, { disabled: boolean }>((theme, _params, getRef) => {
  const dark = theme.colorScheme === 'dark';
  const label = getRef('label');

  return {
    icon: {
      color: 'white',
    },
    input: {
      backgroundColor: 'transparent',
      border: `1px solid ${theme.colors.gray[7]}`,
      '&:checked': {
        backgroundImage: colors.horizontal,
        color: dark ? 'white' : colors.B40,
        border: 'transparent',
        [`& + .${label}`]: {
          fontWeight: 'bold !important',
        },
        '&:disabled': {
          opacity: '0.45',
          '& + svg': {
            color: 'white',
            opacity: '0.45',
          },
        },
      },
      '&:disabled': {
        backgroundColor: 'transparent',
      },
    },
    label: {
      ref: label,
      color: dark ? 'white' : colors.B40,
      fontSize: '14px',
      padding: '0',
      margin: '0 10px',
      opacity: _params.disabled ? 0.4 : 1,
    },
  } as any;
});
