import { CodeHighlightStylesNames } from '@mantine/code-highlight';
import { defineSlotRecipe } from '@pandacss/dev';
import { BUTTON_RECIPE } from './button.recipe';

// full enumeration of the component library's slots
const SLOTS: CodeHighlightStylesNames[] = ['root', 'pre', 'code', 'copy'];

export const CODE_BLOCK_RECIPE = defineSlotRecipe({
  className: 'code-block',
  jsx: ['CodeBlock'],
  slots: SLOTS,
  base: {
    root: {
      bg: 'codeBlock.surface !important',
    },
    code: {
      color: 'codeBlock.text !important',
    },
    pre: {},
    copy: {
      ...BUTTON_RECIPE.variants.transparent,
    },
  },
});
