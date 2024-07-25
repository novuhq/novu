import { defineGlobalStyles } from '@pandacss/dev';

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
  },
  a: {
    textDecoration: 'none',
    color: 'inherit',
  },
});
