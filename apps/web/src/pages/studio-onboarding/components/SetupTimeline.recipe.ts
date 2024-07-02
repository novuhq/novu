import { TimelineItemStylesNames } from '@mantine/core';
import { sva } from '@novu/novui/css';

const SLOTS: TimelineItemStylesNames[] = ['itemBullet', 'item', 'itemContent', 'itemTitle', 'itemBody'];
export const timelineRecipe = sva({
  slots: SLOTS,
  base: {
    item: {
      paddingLeft: '175 !important',
      '&:not(:first-of-type)': {
        marginTop: '200 !important',
      },
      // timeline dashed connector line
      '&::before': {
        backgroundColor: 'transparent !important',
        // TODO: fix when legacy colors are removed
        borderColor: { base: 'legacy.B30 !important', _dark: 'legacy.B85 !important' },
      },
    },

    itemTitle: {
      margin: '0 !important',
      fontWeight: 'strong !important',
      color: 'typography.text.main !important',
      lineHeight: '1.5rem !important',
    },
    itemBullet: {
      fontWeight: 'strong',
      border: 'none',
      '&[data-active]': {
        bg: {
          base: 'typography.text.feedback.success !important',
          _dark: 'typography.text.feedback.success !important',
        },
      },
    },
    itemBody: {
      lineHeight: '1.25rem',
      color: 'typography.text.secondary',
    },

    itemContent: {
      display: 'block',
      opacity: 1,
      maxHeight: '400px',
    },
  },
});
