import { css } from '../../../styled-system/css';

export const popoverDropdownStyle = css({
  p: '100 !important',
  pr: '125 !important',
  backgroundColor: 'surface.popover !important',
  color: 'typography.text.secondary',
  position: 'absolute',
  border: 'none',
  shadow: 'medium !important',
});

export const popoverArrowStyle = css({
  backgroundColor: 'surface.popover !important',
  height: '50',
  border: 'none',
  margin: '0',
});

export const linkStyles = css({
  fontWeight: 'bold',
  textDecoration: 'underline !important',

  '&:hover': {
    cursor: 'pointer',
  },
});

export const closeButtonStyles = css({
  position: 'absolute',
  cursor: 'pointer',
  top: '7px',
  right: '10px',
  zIndex: '2',
  p: '25',
  // TODO: design system values when available
  borderRadius: '0.25rem',
  '& svg': {
    fill: 'typography.text.main',
  },
  _hover: {
    bg: 'surface.panel',
  },
});
