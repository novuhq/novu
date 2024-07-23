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
      color: 'variable.text !important',
      borderRadius: 'xs',
      background: 'variable.surface !important',
      p: '25',
      lineHeight: '125',
      borderColor: 'variable.border !important',
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
