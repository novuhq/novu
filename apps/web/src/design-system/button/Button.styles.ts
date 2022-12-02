import { createStyles, MantineTheme } from '@mantine/core';
import { colors, shadows } from '../config';

const getGradient = (color) => `linear-gradient(0deg, ${color} 0%, ${color} 100%)`;

const getLabelStyles = () => ({
  backgroundImage: colors.horizontal,
  backgroundClip: 'text',
  fontWeight: 'bold',
});

export const getOutlineStyles = (theme) => {
  const dark = theme.colorScheme === 'dark';

  return {
    border: '1px solid transparent',
    background: `${dark ? getGradient(colors.B17) : getGradient(colors.white)} padding-box, ${
      colors.horizontal
    } border-box`,
    color: dark ? theme.white : 'transparent',
    boxShadow: dark ? shadows.dark : shadows.medium,
  };
};

export default createStyles(
  (
    theme: MantineTheme,
    { disabled, inherit, variant }: { disabled: boolean; inherit: boolean; variant?: string },
    getRef
  ) => {
    const loading = getRef('loading');
    let overrides = {};
    if (variant === 'outline') {
      overrides = getOutlineStyles(theme);
    }

    return {
      label: disabled ? {} : getLabelStyles(),
      root: {
        backgroundImage: colors.horizontal,
        width: inherit ? '100%' : '',
        [`&:not(.${loading}):disabled`]: {
          boxShadow: 'none',
        },
        '&&:hover': {
          backgroundSize: '100%',
        },
        ...overrides,
      },
    };
  }
);
