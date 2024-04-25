import { MantineTheme } from '@mantine/core';
import { colors } from './colors';

export const INPUT_HEIGHT_PX = 50;

export const inputStyles = (theme: MantineTheme) => {
  const dark = theme.colorScheme === 'dark';

  const primaryColor = dark ? theme.white : theme.colors.gray[8];
  const invalidColor = colors.vertical;
  const secondaryColor = dark ? theme.colors.dark[3] : theme.colors.gray[6];

  return {
    rightSection: {
      color: `${theme.colors.gray[7]} !important`,
    },
    input: {
      minHeight: `${INPUT_HEIGHT_PX}px`,
      borderRadius: '7px',
      borderColor: dark ? theme.colors.dark[5] : theme.colors.gray[5],
      backgroundColor: 'transparent',
      color: primaryColor,
      margin: '5px 0px',
      '&:focus, &:focus-within': {
        borderColor: theme.colors.gray[7],
      },
      '&::placeholder': {
        color: secondaryColor,
      },
      '&:focus&:invalid': {
        borderColor: colors.error,
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
    disabled: {
      backgroundColor: `${dark ? colors.B20 : colors.B98} !important`,
      borderColor: `${dark ? colors.B30 : colors.BGLight} !important`,
      color: `${primaryColor} !important`,
      '&::placeholder': {
        color: `${secondaryColor} !important`,
      },
    },
  };
};
