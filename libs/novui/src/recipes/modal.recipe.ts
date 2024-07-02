import { defineSlotRecipe } from '@pandacss/dev';
import { ModalBaseStylesNames } from '@mantine/core';

const SLOTS: ModalBaseStylesNames[] = ['body', 'header', 'title', 'overlay', 'root', 'content', 'close', 'inner'];

export const MODAL_RECIPE = defineSlotRecipe({
  className: 'modal',
  jsx: ['Modal'],
  slots: SLOTS,
  base: {
    root: {
      colorPalette: 'mode.cloud',
      borderRadius: '75',
      position: 'relative',
      padding: '50',
      color: 'typography.text.main',
      width: 'modal.width !important',
    },
    inner: {
      width: 'full',
    },
    header: {
      background: 'modal.background !important',
      padding: '100 !important',
    },
    title: {
      fontSize: '100',
      lineHeight: '125',
      marginBottom: '25',
    },
    content: {
      background: 'modal.background !important',
      boxShadow: 'medium !important',
    },
    overlay: {
      background: 'surface.page !important',
      opacity: 'overlay !important',
    },
    body: {
      padding: '100 !important',
    },
    close: {
      position: 'absolute',
      top: '25',
      right: '25',
      background: 'transparent !important',
      color: 'icon.main !important',
    },
  },
});
