import { createStyles, MantineTheme } from '@mantine/core';
import { ExpandStepsTypeEnum } from './Timeline';

interface ITimelineParams {
  expandSteps: ExpandStepsTypeEnum;
}

export default createStyles((theme: MantineTheme, { expandSteps }: ITimelineParams, getRef) => {
  const itemContent = getRef('itemContent');

  return {
    item: {
      ...(expandSteps === ExpandStepsTypeEnum.HOVER && {
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
        marginTop: '16px',
      },
    },

    itemTitle: { margin: '0px', lineHeight: '24px' },

    itemBody: {
      lineHeight: '20px',
    },

    itemContent: {
      ref: itemContent,

      opacity: 0,
      maxHeight: 0,

      ...(expandSteps === ExpandStepsTypeEnum.TRUE && {
        display: 'block',
        opacity: 1,
        maxHeight: '400px',
      }),
    },
  };
});
