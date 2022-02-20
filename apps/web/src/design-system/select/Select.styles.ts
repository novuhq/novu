import { createStyles, MantineTheme } from '@mantine/core';

export default createStyles((theme: MantineTheme) => {
  const dark = theme.colorScheme === 'dark';

  return {
    rightSection: {
      color: `${dark ? theme.white : theme.colors.gray[8]} !important`,
      pointerEvents: 'none',
      marginRight: '2.5px',
    },
    dropdown: {
      backgroundColor: dark ? theme.colors.dark[4] : theme.white,
      height: '140px',
      borderRadius: '7px',
      padding: '5px',
      border: 'none',
      margin: '5px 0px',
      boxShadow: dark ? theme.shadows.lg : theme.shadows.md,
    },
    item: {
      padding: '10px',
      borderRadius: '5px',
      color: dark ? theme.white : theme.colors.gray[8],
      left: '5px',
      top: '5px',
      height: '40px',
      margin: '2.5px 0px',
      lineHeight: '20px',
    },
    values: {
      height: '49px',
      lineHeight: '50px',
    },
    value: {
      borderRadius: '5px',
      backgroundColor: dark ? theme.colors.dark[4] : theme.colors.gray[0],
      padding: '15px 7px 15px 10px',
      margin: '0px 5px',
      fontWeight: '400px',
    },
    selected: {
      backgroundColor: dark ? theme.fn.lighten(theme.colors.dark[5], 0.1) : theme.fn.darken(theme.colors.gray[2], 0.1),
    },
    hovered: {
      backgroundColor: dark ? theme.colors.dark[5] : theme.colors.gray[2],
    },
  };
});
