import { createStyles } from '@mantine/core';
import { colors, shadows } from '../config';
import { getGradient } from '../config/helper';

export const useStyles = createStyles((theme) => {
  const dark = theme.colorScheme === 'dark';

  return {
    active: {
      background: `${dark ? getGradient(colors.B20) : getGradient(colors.white)} padding-box, ${
        colors.horizontal
      } border-box`,
      boxShadow: dark ? shadows.dark : shadows.light,
    },
    variant: {
      height: '120px',
    },
    header: {
      padding: '8px 0',
      marginLeft: '-8px',
      height: '40px',
    },
    button: {
      height: '80px',
      width: '100%',
      margin: '0px',
      marginBottom: '20px',
      padding: '0 20px',
      paddingRight: '10px',
      backgroundColor: dark ? colors.B17 : colors.B98,
      borderRadius: '7px',
      fontWeight: 700,
      border: '1px solid transparent',

      '&:hover': {
        backgroundColor: dark ? colors.B20 : colors.BGLight,
      },
    },
    linkIcon: {
      marginLeft: '5px',
      color: dark ? colors.B40 : colors.B70,
      '& *': {
        display: 'block',
      },
    },
  };
});
