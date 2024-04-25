import { css } from '../../styled-system/css';

export const previewContainerStyles = css({
  bgColor: {
    base: 'surface.popover',
    // TODO: Remove legacy colors, once the design system is updated
    _light: 'legacy.BGLight',
  },
  borderRadius: '0.75rem',
  position: 'relative',
  overflow: 'hidden',
  minWidth: '4.5rem',
  width: '4.5rem',
  height: '4.5rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',

  '& > img': {
    // TODO: use token values when available
    width: '3rem',
    height: '3rem',
    objectFit: 'contain',
  },

  '& > svg': {
    fill: 'typography.text.tertiary',
  },

  _hover: {
    '& .image-input': {
      display: 'flex',
    },
  },
});

export const imageUploadStyles = css({
  background: 'rgba(255, 255, 255, 0.02)',
  backdropFilter: 'blur(2px)',
  position: 'absolute',
  top: '0',
  left: '0',
  display: 'none',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.25rem',
  height: '100%',
  width: '100%',
  cursor: 'pointer',
  color: 'typography.text.main',

  '& > svg': {
    fill: 'typography.text.main',
  },
});
