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
      borderColor: 'input.border',
      _groupError: {
        borderColor: 'input.border.error',
      },
    },
    content: {
      // After fixing the layer css we would like to spread  INPUT_RECIPE.base.input
      background: 'input.surface',
      borderColor: 'input.border',
      borderRadius: 'input',
      lineHeight: '125',
      color: 'typography.text.main',

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
