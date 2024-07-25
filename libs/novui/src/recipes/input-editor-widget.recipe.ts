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
      // override tiptap styles
      '& .tiptap': {
        p: '0',
      },
      // appearance of autocomplete suggestion after being selected and added inline to the input
      '& .suggestion': {
        color: 'variable.text',
        borderRadius: 'xs',
        background: 'variable.surface',
        p: '25',
        lineHeight: '125',
        borderColor: 'variable.border',
        border: 'solid',
      },
    },
  },
  staticCss: ['*'],
});
