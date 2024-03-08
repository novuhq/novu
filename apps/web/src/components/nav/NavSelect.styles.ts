import { css } from '../../styled-system/css';

// TODO: these are ugly, but necessary for overriding Mantine + our design-system overrides
export const navSelectStyles = css({
  '& input': { bg: 'transparent', border: 'none !important', pl: '3.25rem !important' },
  '& .mantine-Select-icon': { width: 'inherit !important' },
  '& .mantine-Select-dropdown': { top: '50px !important' },
});
