import { createStyles, MantineTheme } from '@mantine/core';

import { colors } from '../config';

export default createStyles((theme: MantineTheme, withIcon: boolean, getRef) => {
  const dark = theme.colorScheme === 'dark';

  const tabLabel = getRef('tabLabel');
  const tabIcon = getRef('tabIcon');

  return {
    tabsList: {
      gap: '30px',
    },

    tabControl: {
      marginBottom: withIcon ? '30px' : '0',
      padding: '0px',
      height: '30px',
    },

    tabActive: {
      width: 'auto',
      [`& .${tabLabel}`]: {
        color: dark ? colors.white : colors.B40,

        '&::after': {
          content: '""',
          display: 'block',

          height: '2px',
          marginTop: '10px',
          background: theme.colors.gradient[8],
          borderRadius: '10px',
        },
      },

      [`& .${tabIcon}`]: {
        color: 'red',
        background: theme.colors.gradient[8],
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      },
    },

    tabInner: {
      display: 'block',
      cursor: 'pointer',

      '&:hover': {
        [`& .${tabIcon}`]: {
          color: dark ? colors.white : colors.B40,
        },

        [`& .${tabLabel}`]: {
          color: dark ? colors.white : colors.B40,
        },
      },
    },

    tabLabel: {
      ref: tabLabel,

      fontSize: '14px',
      fontWeight: '700',
      color: colors.B60,
      textAlign: 'left',
    },

    tabIcon: {
      ref: tabIcon,

      display: 'block',
      fontSize: '26px',
      fontWeight: '700',
      marginBottom: '5px',
      color: colors.B60,
      textAlign: 'left',
    },
  };
});
