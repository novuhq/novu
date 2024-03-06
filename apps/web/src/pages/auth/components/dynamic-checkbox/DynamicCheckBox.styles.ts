import { createStyles } from '@mantine/core';
import { colors } from '@novu/design-system';

export const checkboxStyles = createStyles((theme, _params, getRef) => {
  const dark = theme.colorScheme === 'dark';

  return {
    input: {
      position: 'absolute',

      backgroundColor: 'transparent',
      borderColor: 'transparent',

      '&:hover': {
        border: `1px solid white`,
      },

      '&:checked': {
        backgroundImage: colors.horizontal,
        border: 'transparent',
      },
    },

    label: {
      paddingLeft: 4,
      fontSize: '14px',
      fontWeight: 'bold',
      color: dark ? colors.B60 : colors.B60,
    },
  };
});

export const tooltipStyles = createStyles((theme, _params, getRef) => {
  const dark = theme.colorScheme === 'dark';

  return {
    tooltip: {
      padding: '16px',
      background: dark ? colors.B20 : colors.white,
      color: dark ? colors.B60 : colors.B60,
      fontSize: '14px',
      boxShadow: dark ? 'none' : '0px 5px 15px 0px #2644800D',
    },
  };
});
