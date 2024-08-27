import { defineSlotRecipe } from '@pandacss/dev';
import { RichTextEditorStylesNames } from '@mantine/tiptap';
import { INPUT_RECIPE } from './input.recipe';

// full enumeration of the component library's slots
const SLOTS: RichTextEditorStylesNames[] = [
  'linkEditorSave',
  'linkEditorDropdown',
  'root',
  'content',
  'typographyStylesProvider',
  'control',
  'controlsGroup',
  'toolbar',
  'linkEditor',
  'linkEditorInput',
  'linkEditorExternalControl',
];
export const INPUT_EDITOR_WIDGET_RECIPE = defineSlotRecipe({
  className: 'inputEditorWidget',
  jsx: ['InputEditorWidget'],
  slots: SLOTS,
  base: {
    root: {
      ...INPUT_RECIPE.base.input,
      _groupError: {
        borderColor: 'input.border.error',
      },
    },
    content: {
      bg: 'inherit',

      // override tiptap styles
      '& .tiptap': {
        p: '0',
      },
      // appearance of autocomplete suggestion after being selected and added inline to the input
      '& .suggestion': {
        color: 'variable.text',
        borderRadius: 'xs',
        background: 'variable.surface',
        px: '25',
        py: '[0.125rem]',
        lineHeight: '125',
        borderColor: 'variable.border',
        border: 'solid',

        '&:focus, &:focus-within, &:focus-visible': {
          outline: 'none',
          border: 'solid',
          borderColor: 'input.border.active',
        },

        _error: {
          color: 'input.border.error',
          border: 'none',
          background: 'none',
          textDecoration: 'underline',
          textDecorationStyle: 'wavy',
          textDecorationColor: 'input.border.error',
          // Panda doesn't use spacing tokens by default for offset
          textUnderlineOffset: 'var(--nv-spacing-25)',
          textDecorationThickness: 'from-font',
        },
      },
    },
  },
  staticCss: ['*'],
});
