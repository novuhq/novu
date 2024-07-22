import { css } from '../../../styled-system/css';
import { type MenuStylesNames } from '@mantine/core';

const variableSuggestionListStyles: Partial<Record<MenuStylesNames, string>> = {
  item: css({
    padding: '50 !important',
    marginY: '25',
    borderRadius: '50 !important',

    overflow: 'none !important',
    textOverflow: 'ellipsis',
    color: 'typography.text.main !important',
    _hover: {
      bg: 'select.option.surface.hover !important',
    },
    _selected: {
      fontWeight: 'strong',
      bg: 'select.option.surface.selected !important',
    },
  }),
  dropdown: css({
    bg: 'surface.popover !important',
    borderRadius: 'input !important',
    padding: '25',
    marginY: '25',
    border: 'none !important',
    boxShadow: 'medium !important',
    color: 'typography.text.main',
    maxHeight: '[200px]',
    overflow: 'none !important',
    overflowY: 'auto',
    textOverflow: 'ellipsis',
  }),
};

export default variableSuggestionListStyles;
