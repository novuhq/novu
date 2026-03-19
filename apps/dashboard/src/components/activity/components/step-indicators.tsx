import { IActivityJob, JobStatusEnum, StepTypeEnum } from '@novu/shared';
import { useEffect, useRef, useState } from 'react';
import { STEP_TYPE_TO_ICON } from '@/components/icons/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/primitives/popover';
import { cn } from '@/utils/ui';
import { STATUS_STYLES } from '../constants';
import { StatusPreviewCard } from './status-preview-card';

export interface StepIndicatorsProps {
  jobs: IActivityJob[];
  size?: 'sm' | 'md';
}

export function StepIndicators({ jobs, size = 'md' }: StepIndicatorsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const visibleJobs = jobs.slice(0, 4);
  const remainingJobs = jobs.slice(4);
  const hasRemainingJobs = remainingJobs.length > 0;
  const remainingJobsStatus = getRemainingJobsStatus(remainingJobs);

  const sizeClasses = {
    sm: 'h-5 w-5',
    md: 'h-7.5 w-7.5',
  };

  const remainingSizeClasses = {
    sm: 'h-5 min-w-5',
    md: 'h-7.5 min-w-7.5',
  };

  return (
    <Popover open={isOpen}>
      <PopoverTrigger onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        <div className="flex items-center">
          {visibleJobs.map((job) => (
            <div
              key={job._id}
              className={cn(
                '-ml-2 flex items-center justify-center rounded-full border first:ml-0',
                sizeClasses[size],
                STATUS_STYLES[job.status as keyof typeof STATUS_STYLES] ?? STATUS_STYLES.default
              )}
            >
              {getStepIcon(job.type, size)}
            </div>
          ))}
          {hasRemainingJobs && (
            <div
              className={cn(
                '-ml-2 flex items-center justify-center rounded-full px-1 text-xs font-medium',
                remainingSizeClasses[size],
                STATUS_STYLES[remainingJobsStatus]
              )}
            >
              +{remainingJobs.length}
            </div>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-fit p-0 shadow-lg"
        align="end"
        sideOffset={8}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={handleMouseLeave}
      >
        <StatusPreviewCard jobs={jobs} />
      </PopoverContent>
    </Popover>
  );
}

function getStepIcon(type?: StepTypeEnum, size: 'sm' | 'md' = 'md') {
  const Icon = STEP_TYPE_TO_ICON[type as keyof typeof STEP_TYPE_TO_ICON];
  const iconSizeClasses = {
    sm: 'h-2.5 w-2.5',
    md: 'h-4 w-4',
  };

  return <Icon className={iconSizeClasses[size]} />;
}

function getRemainingJobsStatus(jobs: IActivityJob[]): 'completed' | 'failed' | 'default' {
  const hasFailedJob = jobs.some((job) => job.status === JobStatusEnum.FAILED);
  const allCompleted = jobs.every((job) => job.status === JobStatusEnum.COMPLETED);

  if (hasFailedJob) return 'failed';
  if (allCompleted) return 'completed';

  return 'default';
}
