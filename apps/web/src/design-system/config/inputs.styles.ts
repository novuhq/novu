import { MantineTheme } from '@mantine/core';

export const inputStyles = (theme: MantineTheme) => {
  const dark = theme.colorScheme === 'dark';

  const primaryColor = dark ? theme.white : theme.colors.gray[8];
  const invalidColor = theme.colors.gradient[5];
  const secondaryColor = dark ? theme.colors.dark[3] : theme.colors.gray[6];

  return {
    input: {
      height: '50px',
      lineHeight: '50px',
      borderColor: dark ? theme.colors.dark[5] : theme.colors.gray[5],
      color: primaryColor,
      margin: '5px 0px',
      '&:focus, &:focus-within': {
        borderColor: theme.colors.gray[7],
      },
      '&::placeholder': {
        color: secondaryColor,
      },
    },
    label: {
      color: primaryColor,
      fontWeight: 700,
      fontSize: '14px',
      lineHeight: '17px',
      margin: '5px 0px',
    },
    invalid: {
      borderColor: invalidColor,
      color: primaryColor,
      '&::placeholder': {
        color: secondaryColor,
      },
    },
    error: {
      color: `${invalidColor} !important`,
      fontSize: '12px',
    },
    description: {
      color: `${secondaryColor} !important`,
      fontSize: `14px !important`,
      fontWeight: 400,
      marginTop: '0px',
      marginBottom: '10px',
      lineHeight: '17px',
    },
  };
};
