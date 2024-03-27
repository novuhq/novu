import { createStyles, MantineTheme } from '@mantine/core';
import { colors, shadows } from '../config';

const getGradient = (color) => `linear-gradient(0deg, ${color} 0%, ${color} 100%)`;

const getLabelStyles = (disabled: boolean, variant?: string): any => {
  if (disabled && variant === 'subtle') {
    return {
      gap: '8px',
    };
  }

  if (disabled) {
    return {};
  }

  return {
    backgroundImage: colors.horizontal,
    backgroundClip: 'text',
    fontWeight: 'bold',
    gap: '8px',
  };
};

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

export const getSubtleStyles = (theme) => {
  const dark = theme.colorScheme === 'dark';

  return {
    border: 'none',
    padding: '0 8px',
    background: 'transparent',
    color: dark ? theme.white : 'transparent',
    boxShadow: 'none',
    '.mantine-Button-label': {
      'div[data-square]': {
        color: colors.white,
        backgroundImage: colors.horizontal,
        backgroundColor: 'transparent',
      },
    },
    '&:hover:not(:disabled)': {
      background: 'transparent',
      color: dark ? theme.white : 'transparent',
      filter: dark ? 'none' : 'brightness(0.9)',
      '.mantine-Button-label': {
        'div[data-square]': {
          color: dark ? colors.gradientMiddle : theme.white,
          backgroundColor: dark ? theme.white : 'transparent',
          backgroundImage: dark ? 'none' : colors.horizontal,
        },
        'div:last-of-type': {
          backgroundImage: 'none !important',
          backgroundColor: dark ? theme.white : 'transparent',
          backgroundClip: 'none !important',
          color: 'transparent',
          WebkitTextFillColor: 'initial !important',
        },
      },
    },
    '&:focus:not(:disabled)': {
      background: 'transparent',
      color: dark ? theme.white : 'transparent',
      filter: dark ? 'none' : 'brightness(0.9)',
      '.mantine-Button-label': {
        'div[data-square]': {
          color: dark ? colors.gradientMiddle : theme.white,
          backgroundColor: dark ? theme.white : 'transparent',
          backgroundImage: dark ? 'none' : colors.horizontal,
        },
        'div:last-of-type': {
          backgroundImage: 'none !important',
          backgroundColor: dark ? theme.white : 'transparent',
          backgroundClip: 'none !important',
          color: 'transparent',
          WebkitTextFillColor: 'initial !important',
        },
      },
    },
    '&:disabled': {
      opacity: 0.4,
      background: 'transparent',
    },
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

    if (variant === 'subtle') {
      overrides = getSubtleStyles(theme);
    }

    if (pulse) {
      overrides = Object.assign({}, overrides, getPulseStyles());
    }

    return {
      label: getLabelStyles(disabled, variant),
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
