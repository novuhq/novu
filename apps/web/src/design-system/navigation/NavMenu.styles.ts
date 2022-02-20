import { createStyles, MantineTheme } from '@mantine/core';

export default createStyles((theme: MantineTheme) => {
  const dark = theme.colorScheme === 'dark';

  return {
    tabsListWrapper: {
      width: '100%',
      maxWidth: '300px',
    },
    tabLabel: {
      fontSize: '14px',
      fontWeight: '700',
    },
    tabIcon: {
      marginLeft: '5px',
      '&:not(:only-child)': {
        marginRight: '10px',
      },
    },
    tabControl: {
      display: 'flex',
      alignItems: 'center',
      height: '50px',
      width: '100%',
      margin: '7.5px 0px',
      position: 'relative',
      padding: theme.spacing.xs,
      boxSizing: 'border-box',
      color: theme.colors.gray[7],
      background: 'transparent',
      borderRadius: '7px 7px 7px 7px',

      '&:hover': {
        backgroundColor: dark ? theme.colors.dark[7] : theme.white,
        color: dark ? theme.white : theme.colors.gray[8],
        boxShadow: dark ? theme.shadows.lg : theme.shadows.sm,
      },
    },

    tabActive: {
      display: 'flex',
      alignItems: 'center',
      width: '100%',
      height: '50px',
      margin: '7.5px 0px',
      position: 'relative',
      padding: theme.spacing.xs,
      boxSizing: 'border-box',
      color: dark ? theme.white : theme.colors.gray[8],
      background: dark ? theme.colors.dark[7] : theme.white,
      boxShadow: dark ? theme.shadows.lg : theme.shadows.sm,
      backgroundClip: 'padding-box',
      borderRadius: '7px 7px 7px 7px',

      '&:before': {
        content: '""',
        position: 'absolute',
        width: '8px',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        borderRadius: '7px 0px 0px 7px',
        background: theme.colors.gradient[7],
      },
    },
  };
});
