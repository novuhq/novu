import { Timeline as MantineTimeline } from '@mantine/core';
import { PropsWithChildren } from 'react';

import { TIMELINE_STYLES } from './Timeline.styles';

interface ITimelineProps {
  className?: string;
}

/**
 * TODO: extract this to the design-system
 * Use MantineTimeline.Item as a wrapper for each child
 */
export const Timeline = ({ children, className }: PropsWithChildren<ITimelineProps>) => {
  return (
    <MantineTimeline classNames={TIMELINE_STYLES} className={className} bulletSize={24} lineWidth={1}>
      {children}
    </MantineTimeline>
  );
};
