import React from 'react';
import { Timeline as MantineTimeline } from '@mantine/core';

import useStyles from './Timeline.styles';
import { IOnboardingStep } from '../../consts/types';

export type ExpandStepsType = boolean | 'hover';
interface ITimelineProps {
  steps: IOnboardingStep[];
  expandSteps?: ExpandStepsType;
  className?: string;
}

export function Timeline({ className, steps, expandSteps = true }: ITimelineProps) {
  const { classes } = useStyles({ expandSteps });

  return (
    <MantineTimeline classNames={classes} className={className} bulletSize={24} lineWidth={1}>
      {steps.map((step, index) => {
        const { title, Description } = step;

        return (
          <MantineTimeline.Item
            bullet={index + 1}
            lineVariant={'dashed'}
            key={`${title.toLowerCase().replace(' ', '-')}-${index}`}
            title={title}
          >
            <Description />
          </MantineTimeline.Item>
        );
      })}
    </MantineTimeline>
  );
}
