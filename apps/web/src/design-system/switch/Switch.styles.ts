import { createStyles, MantineTheme } from '@mantine/core';

export default createStyles((theme: MantineTheme, _params, getRef) => {
  const dark = theme.colorScheme === 'dark';
  const label = getRef('label');

  return {
    root: {
      width: '100%',
      maxWidth: '70px',
    },
    input: {
      backgroundColor: dark ? theme.colors.dark[5] : theme.colors.gray[5],
      width: '40px',
      height: '24px',
      border: 'transparent',
      '&::before': {
        border: 'transparent',
        width: '20px',
        height: '20px',
      },
      '&:checked': {
        backgroundImage: theme.colors.gradient[8],
        [`& + .${label}`]: {
          backgroundImage: theme.colors.gradient[8],
          backgroundClip: 'text',
          color: 'transparent',
        },
      },
    },
    label: {
      ref: label,
      paddingLeft: '10px',
      backgroundImage: 'none',
      color: dark ? theme.colors.dark[6] : theme.colors.gray[6],
    },
  };
});
