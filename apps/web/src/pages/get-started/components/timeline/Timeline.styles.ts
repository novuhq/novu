import { createStyles, MantineTheme } from '@mantine/core';
import { colors } from '@novu/design-system';
import { ExpandStepsType } from './Timeline';

interface ITimelineParams {
  expandSteps: ExpandStepsType;
}

export default createStyles((theme: MantineTheme, { expandSteps }: ITimelineParams, getRef) => {
  const itemContent = getRef('itemContent');

  return {
    item: {
      ...(expandSteps === 'hover' && {
        '&:hover': {
          [`& .${itemContent}`]: {
            display: 'block',

            opacity: 1,
            maxHeight: '400px',
            transition: 'opacity 1s ease, max-height 1s ease',
          },
        },
      }),

      '&:not(:first-of-type)': {
        marginTop: '1rem',
      },
      '&::before': {
        backgroundColor: theme.colorScheme === 'dark' ? colors.B30 : colors.B30,
      },
    },

    itemTitle: { margin: 0, lineHeight: '1.5rem', fontWeight: 600 },
    itemBullet: {
      '&[data-with-child]': {
        fontWeight: 600,
        backgroundColor: theme.colorScheme === 'dark' ? colors.B30 : colors.B30,
      },
    },
    itemBody: {
      lineHeight: '1.25rem',
    },

    itemContent: {
      ref: itemContent,

      opacity: 0,
      maxHeight: 0,

      ...(expandSteps === true && {
        display: 'block',
        opacity: 1,
        maxHeight: '400px',
      }),
    },
  };
});
