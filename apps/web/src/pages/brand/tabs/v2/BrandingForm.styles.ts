import { css } from '../../../../styled-system/css';

export const dropzoneWrapperStyles = css({
  position: 'relative',
  rounded: '7px',
  px: '150',
  py: '200',
  width: '15rem',
  border: '1px solid',
  // TODO: Remove legacy colors, once the design system is updated
  borderColor: {
    base: 'legacy.B80',
    _dark: 'legacy.B30',
  },
  _hover: {
    cursor: 'pointer',
  },
});

export const dropzoneOverlayStyles = css({
  display: 'none',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '150',
  zIndex: '20',
  rounded: '7px',
  position: 'absolute',
  top: '0',
  left: '0',
  backdropFilter: 'blur(5px)',
  width: '100%',
  height: '100%',
  /**
   * _groupHover is used style the element based on its parent element's state or attribute
   * REF: https://panda-css.com/docs/concepts/conditional-styles#group-selectors
   */
  _groupHover: {
    display: 'flex',
  },
});
