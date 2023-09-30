import { createStyles, MantineTheme } from '@mantine/core';

import { colors } from '../config';

export default createStyles((theme: MantineTheme) => {
  const dark = theme.colorScheme === 'dark';

  return {
    linkIcon: {
      marginLeft: '5px',
      '& *': {
        display: 'block',
      },
    },
    linkLabel: {
      fontSize: '14px',
      fontWeight: 700,
    },
    link: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: '44px',
      width: '100%',
      margin: '8px 0px',
      position: 'relative',
      padding: theme.spacing.xs,
      boxSizing: 'border-box',
      color: theme.colors.gray[7],
      background: 'transparent',
      borderRadius: '7px',

      '&:hover': {
        backgroundColor: dark ? theme.colors.dark[7] : theme.white,
        color: dark ? theme.white : theme.colors.gray[8],
        boxShadow: dark ? theme.shadows.lg : theme.shadows.sm,
      },

      '&:first-of-type': {
        marginTop: '0px',
      },

      '&:last-of-type': {
        marginBottom: '0px',
      },

      '@media (min-width: 1440px)': {
        margin: '15px 0px',
        height: '50px',
      },
    },
    linkActive: {
      '&, &:hover': {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        height: '44px',
        position: 'relative',
        padding: theme.spacing.xs,
        boxSizing: 'border-box',
        color: dark ? theme.white : theme.colors.gray[8],
        background: dark ? theme.colors.dark[7] : theme.white,
        boxShadow: dark ? theme.shadows.lg : theme.shadows.sm,
        backgroundClip: 'padding-box',
        borderRadius: '7px',

        '&:before': {
          content: '""',
          position: 'absolute',
          width: '8px',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          borderRadius: '7px 0px 0px 7px',
          background: colors.vertical,
        },

        '@media (min-width: 1440px)': {
          height: '50px',
        },
      },
    },
  };
});
