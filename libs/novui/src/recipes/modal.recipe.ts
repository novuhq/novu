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
      width: '90%',
      borderRadius: '75',
      position: 'relative',
      padding: '8',
      color: 'typography.text.main',
    },
    header: {
      padding: '25',
      borderBottom: 'solid',
      borderColor: 'colorPalette.border',
    },
    title: {
      fontSize: '100',
      lineHeight: '125',
      marginBottom: '25',
    },
    content: {
      padding: '0 25',
      width: '90%',
    },
    inner: {
      padding: '0 25',
      width: '90%',
    },
    overlay: {
      background: 'blue',
    },
    close: {
      position: 'absolute',
      top: '25',
      right: '25',
    },
  },
});
