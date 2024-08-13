import { defineGlobalStyles } from '@pandacss/dev';
import { LEGACY_COLOR_TOKENS } from './tokens/colors.tokens';
import { token } from '../styled-system/tokens';

export const GLOBAL_CSS = defineGlobalStyles({
  body: {
    // text styles
    fontFamily: 'system',
    fontWeight: 'regular',
    letterSpacing: '0',
    fontSize: '88',
    textDecoration: 'none',
    color: 'typography.text.main',
    // this is for reverse compatibility with legacy global styles
    lineHeight: '[1.15]',

    backgroundColor: 'surface.page',
    overflow: 'hidden',
    scrollbarWidth: 'thin',
    scrollbarColor: {
      base: `${token('colors.legacy.B80')} transparent`,
      _dark: `${token('colors.legacy.B30')} transparent`,
    },
    '::-webkit-scrollbar': {
      width: '14px',
      height: '14px',
    },
    '::-webkit-scrollbar-thumb': {
      border: '3px solid transparent',
      backgroundClip: 'padding-box',
      borderRadius: '8px',
      backgroundColor: {
        base: `${token('colors.legacy.B80')}`,
        _dark: `${token('colors.legacy.B30')}`,
      },
    },
    '::-webkit-scrollbar-track': {
      backgroundColor: 'transparent',
    },
    '::-webkit-scrollbar-corner': {
      backgroundColor: 'transparent',
    },
  },
  a: {
    textDecoration: 'none',
    color: 'inherit',
  },
});
