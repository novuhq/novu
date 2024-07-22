import { type RichTextEditorStylesNames } from '@mantine/tiptap';
import { css } from '../../../styled-system/css';

const inputEditorStyles: Partial<Record<RichTextEditorStylesNames, string>> = {
  root: css({
    background: 'input.surface !important',
    borderColor: 'input.border !important',
    _groupError: {
      borderColor: 'input.border.error !important',
    },
    '& .suggestion': {
      color: 'suggestion.text !important',
      borderRadius: 'xs',
      background: 'suggestion.surface !important',
      p: '25',
      lineHeight: '125',
      borderColor: 'input.border !important',
      border: 'solid',
    },
  }),
  content: css({
    background: 'input.surface !important',
    borderColor: 'input.border !important',
    borderRadius: 'input !important',
    lineHeight: '125 !important',
  }),
};

export default inputEditorStyles;
