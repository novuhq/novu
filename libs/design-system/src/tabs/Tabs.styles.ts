import { createStyles, MantineTheme } from '@mantine/core';

import { colors } from '../config';

export const useTabsStyles = createStyles((theme: MantineTheme, withIcon: boolean, getRef) => {
  const dark = theme.colorScheme === 'dark';

  const tabLabel = getRef('tabLabel');
  const tabIcon = getRef('tabIcon');

  return {
    tabsList: {
      gap: '30px',
      borderBottom: 'none',
    },

    panel: {
      paddingTop: '15px',
    },

    tab: {
      display: 'block',
      cursor: 'pointer',
      marginBottom: withIcon ? '30px' : '0',
      padding: '0px',
      height: '30px',
      borderBottom: 'none',

      '&:hover': {
        background: 'none',

        [`& .${tabIcon}`]: {
          color: dark ? colors.white : colors.B40,
        },

        [`& .${tabLabel}`]: {
          color: dark ? colors.white : colors.B40,
        },
      },
      ['&[data-active]']: {
        width: 'auto',

        [`& .${tabLabel}`]: {
          color: dark ? colors.white : colors.B40,

          '&::after': {
            content: '""',
            display: 'block',

            height: '2px',
            marginTop: '10px',
            background: colors.horizontal,
            borderRadius: '10px',
          },
        },

        [`& .${tabIcon}`]: {
          color: 'red',
          background: colors.horizontal,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        },
      },
    },

    tabLabel: {
      ref: tabLabel,
      height: '100%',
      fontSize: '14px',
      fontWeight: 700,
      color: colors.B60,
      textAlign: 'left',
    },

    tabIcon: {
      ref: tabIcon,

      display: 'block',
      fontSize: '26px',
      fontWeight: 700,
      marginBottom: '5px',
      color: colors.B60,
      textAlign: 'left',
    },
  };
});
