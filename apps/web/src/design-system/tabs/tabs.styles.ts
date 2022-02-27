import { createStyles, MantineTheme } from '@mantine/core';

export default createStyles((theme: MantineTheme, withIcon: boolean, getRef) => {
  const dark = theme.colorScheme === 'dark';

  const tabLabel = getRef('tabLabel');
  const tabIcon = getRef('tabIcon');

  return {
    tabControl: {
      marginBottom: withIcon ? '30px' : '0',
    },

    tabActive: {
      [`& .${tabLabel}`]: {
        color: dark ? '#FFFFFF' : theme.colors.gray[7],

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
          color: dark ? '#FFFFFF' : theme.colors.gray[7],
        },

        [`& .${tabLabel}`]: {
          color: dark ? '#FFFFFF' : theme.colors.gray[7],
        },
      },
    },

    tabLabel: {
      ref: tabLabel,

      fontSize: '14px',
      fontWeight: '800',
      color: theme.colors.gray[5],
      textAlign: 'left',
    },

    tabIcon: {
      ref: tabIcon,

      display: 'block',
      fontSize: '26px',
      fontWeight: '800',
      marginBottom: '5px',
      color: theme.colors.gray[5],
      textAlign: 'left',
    },
  };
});
