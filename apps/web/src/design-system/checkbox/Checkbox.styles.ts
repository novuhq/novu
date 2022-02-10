import { createStyles, MantineTheme } from '@mantine/core';

export default createStyles((theme: MantineTheme, _params, getRef) => {
  const dark = theme.colorScheme === 'dark';
  const label = getRef('label');

  return {
    input: {
      backgroundColor: dark ? theme.colors.dark[5] : theme.colors.gray[1],
      border: `1.5px solid ${theme.colors.gray[5]}`,
      '&:checked': {
        backgroundImage: theme.colors.gradient[8],
        border: 'transparent',
        [`& + .${label}`]: {
          fontWeight: 'bold !important',
        },
      },
    },
    label: {
      ref: label,
      color: dark ? theme.colors.gray[2] : theme.colors.gray[5],
    },
  };
});
