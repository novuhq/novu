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
    scrollbarWidth: '{sizes.scrollbar.width}',
    scrollbarColor: '{colors.scrollbar.color}',
    /* SAFARI SCROLLBAR SUPPORT - remove after Safari supports `scrollbar-width` and `scrollbar-color` */
    '::-webkit-scrollbar': {
      width: '{sizes.scrollbar.track}',
      height: '{sizes.scrollbar.track}',
    },
    '::-webkit-scrollbar-thumb': {
      // For this calculation, see: https://stackoverflow.com/questions/11691718/css-webkit-scrollbar-and-safari
      border: `calc(({sizes.scrollbar.track} - {sizes.scrollbar.thumb}) / 2) solid {colors.scrollbar.track}`,
      borderRadius: '{sizes.scrollbar.thumb}',
      backgroundClip: 'padding-box',
      backgroundColor: '{colors.scrollbar.thumb}',
    },
    '::-webkit-scrollbar-track': {
      backgroundColor: '{colors.scrollbar.track}',
    },
    '::-webkit-scrollbar-corner': {
      backgroundColor: '{colors.scrollbar.track}',
    },
    /* END SAFARI SCROLLBAR SUPPORT */
  },
  a: {
    textDecoration: 'none',
    color: 'inherit',
  },
});
