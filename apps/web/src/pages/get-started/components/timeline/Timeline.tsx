import React from 'react';
import { createStyles, MantineTheme, Timeline as MantineTimeline } from '@mantine/core';

import useStyles from './Timeline.styles';
import { IOnboardingStep } from '../../consts';

export enum ExpandStepsTypeEnum {
  HOVER = 'hover',
  TRUE = 'true',
  FALSE = 'false',
}

interface ITimelineProps {
  steps: IOnboardingStep[];
  expandSteps?: ExpandStepsTypeEnum;
}

export function Timeline({ steps, expandSteps = ExpandStepsTypeEnum.HOVER }: ITimelineProps) {
  const { classes } = useStyles({ expandSteps });

  return (
    <MantineTimeline classNames={classes} bulletSize={24} lineWidth={1}>
      {steps.map((step, index) => {
        const { title, Description } = step;

        return (
          <MantineTimeline.Item bullet={index + 1} lineVariant={'dashed'} key={index} title={title}>
            <Description />
          </MantineTimeline.Item>
        );
      })}
    </MantineTimeline>
  );
}
