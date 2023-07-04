import { MantineTheme } from '@mantine/core';
import { colors } from '../config';

export const nameInputStyles = (theme: MantineTheme) => {
  const dark = theme.colorScheme === 'dark';

  return {
    root: {
      flex: '1 1 auto',
    },
    wrapper: {
      background: 'transparent',
      width: '100%',
    },
    input: {
      background: 'transparent',
      borderStyle: 'solid',
      borderColor: dark ? theme.colors.dark[5] : theme.colors.gray[5],
      borderWidth: '1px',
      fontSize: '20px',
      fontWeight: 700,
      padding: 9,
      lineHeight: '28px',
      minHeight: 'auto',
      height: 'auto',
      width: '100%',
      textOverflow: 'ellipsis',
      '&:not(:placeholder-shown)': {
        borderStyle: 'none',
        padding: 10,
      },
      '&:hover, &:focus': {
        borderStyle: 'solid',
        padding: 9,
      },
      '&:disabled': {
        backgroundColor: dark ? colors.B15 : theme.white,
        color: dark ? theme.white : theme.black,
        opacity: 1,
      },
    },
  };
};
