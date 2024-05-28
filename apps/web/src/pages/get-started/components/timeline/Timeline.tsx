import { Timeline as MantineTimeline } from '@mantine/core';

import useStyles from './Timeline.styles';
import { IOnboardingStep } from '../../consts/types';

export type ExpandStepsType = boolean | 'hover';
interface ITimelineProps {
  steps: IOnboardingStep[];
  expandSteps?: ExpandStepsType;
  className?: string;
  active?: number;
}

export function Timeline({ className, steps, expandSteps = true, active }: ITimelineProps) {
  const { classes } = useStyles({ expandSteps });

  return (
    <MantineTimeline classNames={classes} active={active} className={className} bulletSize={24} lineWidth={1}>
      {steps.map((step, index) => {
        const { title, Description, bullet } = step;

        return (
          <MantineTimeline.Item
            bullet={bullet ?? index + 1}
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
