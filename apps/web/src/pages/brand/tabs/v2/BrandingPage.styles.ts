import { css } from '../../../../styled-system/css';
import { styled } from '../../../../styled-system/jsx';
import { text } from '../../../../styled-system/recipes';

export const dropzoneWrapperStyles = css({
  position: 'relative',
  // TODO: use border radius values from Design-System once available
  rounded: '7px',
  px: '150',
  py: '200',
  width: '15rem',
  // TODO: use border values from Design-System once available
  border: '1px solid',
  // TODO: Remove legacy colors, once the design system is updated
  borderColor: {
    base: 'legacy.B80',
    _dark: 'legacy.B30',
  },
  _hover: {
    cursor: 'pointer',
    // TODO: Remove legacy colors, once the design system is updated
    backgroundColor: {
      base: 'legacy.white !important',
      _dark: 'legacy.BGDark !important',
    },
    opacity: '0.8',
    backdropFilter: 'blur(6px)',
  },
});

export const dropzoneOverlayStyles = css({
  display: 'none',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '150',
  // TODO: use z-index value from Design-System once available
  zIndex: '20',
  // TODO: use border radius values from Design-System once available
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

export const dropzoneRootStyles = css({
  background: 'none !important',
  border: 'none !important',
});

export const Text = styled('p', text);

export const dropzoneTextStyles = css({
  // TODO: Remove legacy colors, once the design system is updated
  color: 'legacy.B70',
});

export const inputWrapperStyles = css({
  width: '15rem',
});
