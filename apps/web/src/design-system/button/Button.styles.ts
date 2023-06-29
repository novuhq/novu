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

export const getPulseStyles = () => {
  return {
    [`&:not(:disabled):not([data-loading])`]: {
      animation: 'pulse-animation 2s infinite',
      '@keyframes pulse-animation': {
        '0%': {
          boxShadow: '0 0 0 0 rgba(255, 82, 82, 0.7)',
        },
        '70%': {
          boxShadow: '0 0 0 10px rgba(255, 82, 82, 0)',
        },
        '100%': {
          boxShadow: '0 0 0 0 rgba(255, 82, 82, 0)',
        },
      },
    },
  };
};

export default createStyles(
  (
    theme: MantineTheme,
    { disabled, inherit, variant, pulse }: { disabled: boolean; inherit: boolean; variant?: string; pulse?: boolean },
    getRef
  ) => {
    const loading = getRef('loading');
    let overrides = {};
    if (variant === 'outline') {
      overrides = getOutlineStyles(theme);
    }

    if (pulse) {
      overrides = Object.assign({}, overrides, getPulseStyles());
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
        '&:focus': {
          outlineOffset: 0,
          outline: '2px solid rgb(153,200,255)',
        },
        ...overrides,
      },
    };
  }
);
