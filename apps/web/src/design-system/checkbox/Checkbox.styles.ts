import { createStyles, MantineTheme } from '@mantine/core';

export default createStyles((theme: MantineTheme, _params, getRef) => {
  const dark = theme.colorScheme === 'dark';
  const label = getRef('label');

  return {
    input: {
      backgroundColor: 'transparent',
      border: `1px solid ${theme.colors.gray[7]}`,
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
      color: dark ? 'white' : theme.colors.gray[7],
      fontSize: '14px',
      paddingLeft: '10px',
    },
  };
});
