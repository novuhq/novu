import { createStyles } from '@mantine/core';

const getGradient = (theme, color, shade) =>
  `linear-gradient(0deg, ${theme.fn.themeColor(color, shade)} 0%, ${theme.fn.themeColor(color, shade)} 100%)`;

const getLabelStyles = (theme) => ({
  backgroundImage: theme.colors.gradient[8],
  backgroundClip: 'text',
  fontWeight: 'bold',
});
const getFilledStyles = (theme) => ({
  backgroundImage: theme.colorScheme === 'dark' ? getGradient(theme, 'dark', 4) : getGradient(theme, 'gray', 2),
});

const getOutlineStyles = (theme, dark, disabled) => {
  const disabledColor = dark ? getGradient(theme, 'dark', 6) : getGradient(theme, 'gray', 5);
  return {
    border: '1px solid transparent',
    backgroundImage: `${dark ? getGradient(theme, 'dark', 7) : theme.fn.linearGradient(0, theme.white, theme.white)},${
      !disabled ? theme.fn.themeColor('gradient', 8) : disabledColor
    }`,
    backgroundClip: 'padding-box, border-box',
    backgroundOrigin: 'border-box',
    color: theme.colorScheme === 'dark' ? theme.white : 'transparent',
  };
};

export default createStyles((theme, disabled: boolean) => {
  const dark = theme.colorScheme === 'dark';
  return {
    label: !disabled ? getLabelStyles(theme) : {},
    filled: disabled ? getFilledStyles(theme) : {},
    outline: getOutlineStyles(theme, dark, disabled),
  };
});
