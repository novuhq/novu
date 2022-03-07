import { createStyles, MantineTheme } from '@mantine/core';
import { colors, shadows } from '../config';

const getGradient = (color) => `linear-gradient(0deg, ${color} 0%, ${color} 100%)`;

const getLabelStyles = () => ({
  backgroundImage: colors.horizontal,
  backgroundClip: 'text',
  fontWeight: 'bold',
});
const getFilledDisabledStyles = (theme) => ({
  backgroundImage: theme.colorScheme === 'dark' ? getGradient(colors.B20) : getGradient(colors.B98),
});
const getFilledStyles = (theme) => ({
  border: 'transparent',
  boxShadow: theme.colorScheme === 'dark' ? shadows.dark : shadows.color,
});

const getOutlineStyles = (theme, disabled) => {
  const dark = theme.colorScheme === 'dark';
  const backgroundColor = getGradient(dark ? theme.black : theme.white);
  const disabledBorderColor = getGradient(dark ? colors.B20 : colors.BGLight);

  return {
    border: '1px solid transparent',
    backgroundImage: `${backgroundColor},${!disabled ? colors.horizontal : disabledBorderColor}`,
    backgroundClip: 'padding-box, border-box',
    backgroundOrigin: 'border-box',
    color: dark ? theme.white : 'transparent',
    boxShadow: dark ? shadows.dark : shadows.medium,
  };
};

export default createStyles((theme: MantineTheme, disabled: boolean, getRef) => {
  const loading = getRef('loading');

  return {
    label: disabled ? {} : getLabelStyles(),
    filled: disabled ? getFilledDisabledStyles(theme) : getFilledStyles(theme),
    outline: getOutlineStyles(theme, disabled),
    root: {
      [`&:not(.${loading}):disabled`]: {
        boxShadow: 'none',
      },
    },
  };
});
