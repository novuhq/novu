import { createStyles, MantineTheme } from '@mantine/core';

export default createStyles((theme: MantineTheme) => {
  const dark = theme.colorScheme === 'dark';
  return {
    input: {
      width: '500px',
      height: '50px',
      lineHeight: '17px',
      borderColor: dark ? theme.colors.dark[5] : theme.colors.gray[5],
      color: dark ? theme.white : theme.colors.gray[8],
      padding: '10px 10px 10px 15px',
      '&:focus, &:focus-within': {
        borderColor: theme.colors.gray[7],
      },
      '&::placeholder': {
        color: theme.colorScheme === 'dark' ? theme.colors.dark[3] : theme.colors.gray[6],
      },
    },
    label: {
      color: dark ? theme.white : theme.colors.gray[8],
      fontWeight: 700,
      fontSize: '14px',
      lineHeight: '17px',
      margin: '10px 0px',
    },
    invalid: {
      borderColor: theme.colors.gradient[5],
      color: dark ? theme.white : theme.colors.gray[8],
      '&::placeholder': {
        color: theme.colorScheme === 'dark' ? theme.colors.dark[3] : theme.colors.gray[6],
      },
    },
    error: {
      color: `${theme.colors.gradient[5]} !important`,
      fontSize: '12px',
    },
  };
});
