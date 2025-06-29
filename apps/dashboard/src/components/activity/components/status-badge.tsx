import { Popover, PopoverContent, PopoverTrigger } from '@/components/primitives/popover';
import { IActivityJob, JobStatusEnum } from '@novu/shared';
import { useEffect, useRef, useState } from 'react';
import { StatusBadge as StatusBadgeComponent, StatusBadgeIcon } from '../../primitives/status-badge';
import { JOB_STATUS_CONFIG } from '../constants';
import { StatusPreviewCard } from './status-preview-card';
import { getActivityStatus } from '../helpers';

export interface StatusBadgeProps {
  jobs: IActivityJob[];
}

export function ActivityStatusBadge({ jobs }: StatusBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setIsOpen(true);
    }, 200);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const status = getActivityStatus(jobs);

  const { variant, icon: Icon } = JOB_STATUS_CONFIG[status] || JOB_STATUS_CONFIG[JobStatusEnum.PENDING];

  return (
    <Popover open={isOpen}>
      <PopoverTrigger onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        <StatusBadgeComponent variant="stroke" status={variant} className="h-4 w-4 border-0 px-0 ring-0">
          <StatusBadgeIcon as={Icon} />
        </StatusBadgeComponent>
      </PopoverTrigger>
      <PopoverContent
        className="w-64"
        align="start"
        sideOffset={5}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={handleMouseLeave}
      >
        <StatusPreviewCard jobs={jobs} />
      </PopoverContent>
    </Popover>
  );
}
