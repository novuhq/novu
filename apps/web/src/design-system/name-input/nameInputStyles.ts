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
      color: dark ? colors.white : colors.B40,
      borderWidth: '1px',
      fontSize: '20px',
      fontWeight: 700,
      padding: '4px 10px',
      lineHeight: '28px',
      minHeight: 'auto',
      height: 'auto',
      width: '100%',
      textOverflow: 'ellipsis',
      '&:not(:placeholder-shown)': {
        borderColor: 'transparent',
        padding: '4px 10px',
      },
      '&:hover, &:focus': {
        borderColor: dark ? colors.B30 : colors.B80,
        padding: '4px 10px',
      },
      '&:disabled': {
        backgroundColor: dark ? colors.B15 : theme.white,
        color: dark ? theme.white : theme.black,
        opacity: 1,
      },
    },
  };
};
