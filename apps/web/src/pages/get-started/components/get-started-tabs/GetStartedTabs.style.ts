import { createStyles, MantineTheme } from '@mantine/core';
import { colors } from '@novu/design-system';

export default createStyles((theme: MantineTheme, _params, getRef) => {
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
      width: 'auto',
      cursor: 'pointer',
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

        '&::after': {
          content: '""',
          display: 'block',
          position: 'absolute',
          width: '100%',
          height: '2px',
          bottom: 0,
          background: colors.horizontal,
          borderRadius: '10px',
        },

        [`& .${tabLabel}`]: {
          color: dark ? colors.white : colors.B40,
        },

        [`& .${tabIcon}`]: {
          color: dark ? colors.white : colors.B40,
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
      paddingBottom: '12px',
      display: 'flex',
      alignItems: 'center',
    },

    tabIcon: {
      ref: tabIcon,
      color: colors.B60,
    },
  };
});
