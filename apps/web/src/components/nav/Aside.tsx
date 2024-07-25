import { cva } from '@novu/novui/css';
import { styled } from '@novu/novui/jsx';

export const Aside = styled(
  'aside',
  cva({
    base: {
      display: 'flex !important',
      flexDirection: 'column',
      zIndex: 'auto',
      borderRight: 'none',
      width: '[272px]',
      height: 'full',
      p: '100',
      bg: 'surface.panel',
      overflowY: 'auto',
    },
  })
);
