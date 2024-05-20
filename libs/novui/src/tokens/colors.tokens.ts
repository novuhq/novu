import { defineTokens } from '@pandacss/dev';

/**
 * @deprecated
 */
export const LEGACY_COLOR_TOKENS = defineTokens.colors({
  legacy: {
    white: { value: '#FFFFFF', description: '@deprecated', type: 'color' },
    black: { value: '#000000', description: '@deprecated', type: 'color' },
    BGLight: { value: '#EDF0F2', description: '@deprecated', type: 'color' },
    BGDark: { value: '#13131A', description: '@deprecated', type: 'color' },
    B98: { value: '#F5F8FA', description: '@deprecated', type: 'color' },
    B85: { value: '#D5D5D9', description: '@deprecated', type: 'color' },
    B80: { value: '#BEBECC', description: '@deprecated', type: 'color' },
    B70: { value: '#A1A1B2', description: '@deprecated', type: 'color' },
    B60: { value: '#828299', description: '@deprecated', type: 'color' },
    B40: { value: '#525266', description: '@deprecated', type: 'color' },
    B30: { value: '#3D3D4D', description: '@deprecated', type: 'color' },
    B20: { value: '#292933', description: '@deprecated', type: 'color' },
    B15: { value: '#1E1E26', description: '@deprecated', type: 'color' },
    B17: { value: '#23232B', description: '@deprecated', type: 'color' },
    gradientStart: { value: '#FF512F', description: '@deprecated', type: 'color' },
    gradientMiddle: { value: '#ef3f5a', description: '@deprecated', type: 'color' },
    gradientEnd: { value: '#DD2476', description: '@deprecated', type: 'color' },
    success: { value: '#4D9980', description: '@deprecated', type: 'color' },
    warning: { value: '#FF8000', description: '@deprecated', type: 'color' },
    error: { value: '#E54545', description: '@deprecated', type: 'color' },
  },
});

export const COLOR_PALETTE_TOKENS = defineTokens.colors({
  amber: {
    '10': {
      light: { value: '#4e2009ff' },
      dark: { value: '#fef3dd' },
    },
    '20': {
      light: { value: '#ad5700ff' },
      dark: { value: '#f1a10d' },
    },
    '30': {
      light: { value: '#ffa01cff' },
      dark: { value: '#ffcb47' },
    },
    '40': {
      light: { value: '#ffb224ff' },
      dark: { value: '#ffb224' },
    },
    '50': {
      light: { value: '#ee9d2bff' },
      dark: { value: '#824e00' },
    },
    '60': {
      light: { value: '#f3ba63ff' },
      dark: { value: '#693f05' },
    },
    '70': {
      light: { value: '#ffd386ff' },
      dark: { value: '#573300' },
    },
    '80': {
      light: { value: '#ffe3a2ff' },
      dark: { value: '#4a2900' },
    },
    '90': {
      light: { value: '#ffecbcff' },
      dark: { value: '#3f2200' },
    },
    '100': {
      light: { value: '#fff4d5ff' },
      dark: { value: '#341c00' },
    },
    '110': {
      light: { value: '#fff9edff' },
      dark: { value: '#271700' },
    },
    '120': {
      light: { value: '#fefdfbff' },
      dark: { value: '#1f1300' },
    },
  },
  blue: {
    '10': {
      light: { value: '#00254dff' },
      dark: { value: '#eaf6ff' },
    },
    '20': {
      light: { value: '#006adcff' },
      dark: { value: '#52a9ff' },
    },
    '30': {
      light: { value: '#0081f1ff' },
      dark: { value: '#369eff' },
    },
    '40': {
      light: { value: '#0077d4ff' },
      dark: { value: '#0077d4' },
    },
    '50': {
      light: { value: '#5eb0efff' },
      dark: { value: '#0954a5' },
    },
    '60': {
      light: { value: '#96c7f2ff' },
      dark: { value: '#0a4481' },
    },
    '70': {
      light: { value: '#b7d9f8ff' },
      dark: { value: '#0d3868' },
    },
    '80': {
      light: { value: '#cee7feff' },
      dark: { value: '#0f3058' },
    },
    '90': {
      light: { value: '#e1f0ffff' },
      dark: { value: '#102a4c' },
    },
    '100': {
      light: { value: '#edf6ffff' },
      dark: { value: '#10243e' },
    },
    '110': {
      light: { value: '#f5faffff' },
      dark: { value: '#0f1b2d' },
    },
    '120': {
      light: { value: '#fbfdffff' },
      dark: { value: '#0f1720' },
    },
  },
  green: {
    '10': {
      light: { value: '#153226ff' },
      dark: { value: '#e5fbeb' },
    },
    '20': {
      light: { value: '#18794eff' },
      dark: { value: '#4cc38a' },
    },
    '30': {
      light: { value: '#299764ff' },
      dark: { value: '#3cb179' },
    },
    '40': {
      light: { value: '#30a46cff' },
      dark: { value: '#30a46c' },
    },
    '50': {
      light: { value: '#5bb98cff' },
      dark: { value: '#236e4a' },
    },
    '60': {
      light: { value: '#92ceacff' },
      dark: { value: '#1b543a' },
    },
    '70': {
      light: { value: '#b4dfc4ff' },
      dark: { value: '#164430' },
    },
    '80': {
      light: { value: '#ccebd7ff' },
      dark: { value: '#133929' },
    },
    '90': {
      light: { value: '#ddf3e4ff' },
      dark: { value: '#113123' },
    },
    '100': {
      light: { value: '#e9f9eeff' },
      dark: { value: '#0f291e' },
    },
    '110': {
      light: { value: '#f2fcf5ff' },
      dark: { value: '#0c1f17' },
    },
    '120': {
      light: { value: '#fbfefcff' },
      dark: { value: '#0d1912' },
    },
  },
  mauve: {
    '10': {
      light: { value: '#1a1523ff' },
      dark: { value: '#ededef' },
    },
    '20': {
      light: { value: '#6f6e77ff' },
      dark: { value: '#a09fa6' },
    },
    '30': {
      light: { value: '#86848dff' },
      dark: { value: '#7e7d86' },
    },
    '40': {
      light: { value: '#908e96ff' },
      dark: { value: '#706f78' },
    },
    '50': {
      light: { value: '#c8c7cbff' },
      dark: { value: '#504f57' },
    },
    '60': {
      light: { value: '#dcdbddff' },
      dark: { value: '#3e3e44' },
    },
    '70': {
      light: { value: '#e4e2e4ff' },
      dark: { value: '#34343a' },
    },
    '80': {
      light: { value: '#e9e8eaff' },
      dark: { value: '#2e2e32' },
    },
    '90': {
      light: { value: '#eeedefff' },
      dark: { value: '#28282c' },
    },
    '100': {
      light: { value: '#f3f3f3ff' },
      dark: { value: '#232326' },
    },
    '110': {
      light: { value: '#f8f8f8ff' },
      dark: { value: '#1c1c1f' },
    },
    '120': {
      light: { value: '#fcfcfcff' },
      dark: { value: '#161618' },
    },
  },
  red: {
    '10': {
      light: { value: '#381316ff' },
      dark: { value: '#feecee' },
    },
    '20': {
      light: { value: '#cd2b31ff' },
      dark: { value: '#ff6369' },
    },
    '30': {
      light: { value: '#dc3d43ff' },
      dark: { value: '#f2555a' },
    },
    '40': {
      light: { value: '#e5484dff' },
      dark: { value: '#e5484d' },
    },
    '50': {
      light: { value: '#eb9091ff' },
      dark: { value: '#aa2429' },
    },
    '60': {
      light: { value: '#f3aeafff' },
      dark: { value: '#822025' },
    },
    '70': {
      light: { value: '#f9c6c6ff' },
      dark: { value: '#671e22' },
    },
    '80': {
      light: { value: '#fdd8d8ff' },
      dark: { value: '#541b1f' },
    },
    '90': {
      light: { value: '#ffe5e5ff' },
      dark: { value: '#481a1d' },
    },
    '100': {
      light: { value: '#ffefefff' },
      dark: { value: '#3c181a' },
    },
    '110': {
      light: { value: '#fff8f8ff' },
      dark: { value: '#291415' },
    },
    '120': {
      light: { value: '#fffcfcff' },
      dark: { value: '#1f1315' },
    },
  },
});
