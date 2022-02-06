import { createStyles, MantineTheme } from '@mantine/core';

export default createStyles((theme: MantineTheme, _params, getRef) => {
  const dark = theme.colorScheme === 'dark';
  const input = getRef('input');
  return {
    input: {
      backgroundColor: dark ? theme.colors.dark[5] : theme.colors.gray[5],
      borderColor: 'transparent',
      '&:checked': {
        backgroundImage: theme.colors.gradient[8],
      },
    },
    label: {
      paddingLeft: '10px',
      backgroundImage: theme.colors.gradient[8],
      backgroundClip: 'text',
      color: 'transparent',
      // color: dark ? theme.colors.dark[6] : theme.colors.gray[6],   // [`&:not(.${input}):checked`]:
      [`&:not::checked`]: {
        backgroundImage: '',
        color: dark ? theme.colors.dark[6] : theme.colors.gray[6],
      },
    },
  };
});
