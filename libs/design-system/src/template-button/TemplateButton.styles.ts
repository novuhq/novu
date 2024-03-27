import { createStyles } from '@mantine/core';
import { colors, shadows } from '../config';
import { getGradient } from '../config/helper';

export const useTemplateButtonStyles = createStyles((theme) => {
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
    variantRoot: {
      border: `1px dashed ${dark ? colors.B40 : colors.B60}`,
    },
    button: {
      height: '80px',
      width: '100%',
      margin: '0px',
      backgroundColor: dark ? colors.B17 : colors.B98,
      borderRadius: '7px',
      fontWeight: 700,
      border: '1px solid transparent',
      boxShadow: dark ? shadows.dark : shadows.light,

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
