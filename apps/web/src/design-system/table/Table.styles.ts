import { createStyles, MantineTheme } from '@mantine/core';

export default createStyles((theme: MantineTheme, _params, getRef) => {
  const dark = theme.colorScheme === 'dark';
  const hover = { ref: getRef('hover') };
  return {
    hover,
    root: {
      borderCollapse: 'unset',
      borderSpacing: '0px 20px',
      '& thead tr th': {
        fontWeight: '400',
        height: '17px',
        color: dark ? theme.colors.dark[3] : theme.colors.gray[6],
        borderBottom: 'none',
        borderSpacing: '0px',
        paddingBottom: '0px',
      },
      '& tbody tr td': {
        maxWidth: '100px',
        color: dark ? theme.white : theme.colors.gray[8],
        borderBottom: 'none',
        height: '80px',
      },
      '& tbody tr:hover': {
        backgroundColor: dark ? theme.colors.dark[4] : theme.colors.gray[2],
      },
      [`&.${hover.ref} tbody tr:hover`]: {
        backgroundColor: dark ? theme.colors.dark[4] : theme.colors.gray[2],
      },
    },
  };
});
