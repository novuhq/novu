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
      background: 'input.surface !important',
      borderColor: 'input.border !important',
      _groupError: {
        borderColor: 'input.border.error !important',
      },
      '& .suggestion': {
        color: 'variable.text !important',
        borderRadius: 'xs',
        background: 'variable.surface !important',
        p: '25',
        lineHeight: '125',
        borderColor: 'variable.border !important',
        border: 'solid',
      },
    },
    content: {
      ...INPUT_RECIPE.base.input,
    },
  },
});
