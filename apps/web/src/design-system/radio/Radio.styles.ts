import { createStyles, MantineTheme } from '@mantine/core';
import { colors } from '../config';

export default createStyles((theme: MantineTheme, _params, getRef) => {
  const dark = theme.colorScheme === 'dark';
  const label = getRef('label');

  return {
    radio: {
      marginRight: '10px',
      color: colors.B60,
      background: 'transparent',
      border: `1px solid ${colors.B60}`,
      '&:disabled': {
        opacity: '0.85',
        '& + span': {
          opacity: '0.85',
        },
      },
      '&:disabled:not(:checked)': {
        background: 'transparent',
      },
      '&:checked:before': {
        width: '8px',
        height: '8px',
        background: 'white',
      },
      '&:checked': {
        color: dark ? 'white' : colors.B40,
        border: 'none',
        '&:disabled': {
          opacity: '0.65',
          '& + span': {
            opacity: '0.65',
          },
        },
        '& + span': {
          color: dark ? 'white' : colors.B40,
        },
      },
    },
    label: {
      ref: label,
      color: colors.B60,
      fontSize: '14px',
      paddingLeft: '10px',
    },
  };
});
