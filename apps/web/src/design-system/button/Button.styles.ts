import { createStyles, MantineTheme } from '@mantine/core';

const getGradient = (color) => `linear-gradient(0deg, ${color} 0%, ${color} 100%)`;

const getLabelStyles = (theme) => ({
  backgroundImage: theme.colors.gradient[8],
  backgroundClip: 'text',
  fontWeight: 'bold',
});
const getFilledStyles = (theme) => ({
  backgroundImage: theme.colorScheme === 'dark' ? getGradient(theme.colors.dark[4]) : getGradient(theme.colors.gray[2]),
});
const getOutlineStyles = (theme, disabled) => {
  const dark = theme.colorScheme === 'dark';
  const backgroundColor = getGradient(dark ? theme.black : theme.white);
  const disabledBorderColor = getGradient(dark ? theme.colors.dark[4] : theme.colors.gray[0]);
  return {
    border: '1px solid transparent',
    backgroundImage: `${backgroundColor},${!disabled ? theme.colors.gradient[8] : disabledBorderColor}`,
    backgroundClip: 'padding-box, border-box',
    backgroundOrigin: 'border-box',
    color: dark ? theme.white : 'transparent',
  };
};

export default createStyles((theme: MantineTheme, disabled: boolean) => {
  return {
    label: !disabled ? getLabelStyles(theme) : {},
    filled: disabled ? getFilledStyles(theme) : { border: 'transparent' },
    outline: getOutlineStyles(theme, disabled),
  };
});
