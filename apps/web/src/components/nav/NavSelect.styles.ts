import { css } from '@novu/novui/css';

// TODO: these are ugly, but necessary for overriding Mantine + our design-system overrides
export const navSelectStyles = css({
  fontWeight: 'strong !important',
  marginLeft: '75 !important',

  '& input': { bg: 'transparent', border: 'none !important', pl: '250 !important' },
  '& .mantine-Select-icon': { width: 'inherit !important' },
  '& .mantine-Select-dropdown': { top: '50px !important' },
});

export const tooltipStyles = css({
  p: '100 !important',
  bg: 'surface.popover !important',
  color: 'typography.text.secondary !important',
  zIndex: 'tooltip !important',
});

export const arrowStyles = css({
  w: '100 !important',
  h: '100 !important',
  left: '-50 !important',
  top: '18px !important',
  bg: 'surface.popover !important',
});
