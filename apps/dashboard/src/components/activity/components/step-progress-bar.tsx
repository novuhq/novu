import { cn } from '@/utils/ui';
import { STATUS_STYLES } from '../constants';
import { IActivityJob, JobStatusEnum, StepTypeEnum } from '@novu/shared';
import { STEP_TYPE_TO_ICON } from '@/components/icons/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/primitives/popover';
import { useEffect, useRef, useState } from 'react';
import { StatusPreviewCard } from './status-preview-card';

export interface StepProgressBarProps {
  jobs: IActivityJob[];
  size?: 'sm' | 'md';
}

export function StepProgressBar({ jobs, size = 'md' }: StepProgressBarProps) {
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

  const visibleJobs = jobs.slice(0, 4);
  const remainingJobs = jobs.slice(4);
  const hasRemainingJobs = remainingJobs.length > 0;
  const remainingJobsStatus = getRemainingJobsStatus(remainingJobs);

  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
  };

  const remainingSizeClasses = {
    sm: 'h-6 min-w-6',
    md: 'h-8 min-w-8',
  };

  const iconSizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
  };

  return (
    <Popover open={isOpen}>
      <PopoverTrigger onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        <div className="flex items-center gap-1">
          {visibleJobs.map((job) => (
            <div
              key={job._id}
              className={cn(
                'flex items-center justify-center rounded-lg border-2 transition-all duration-200 hover:shadow-sm',
                sizeClasses[size],
                STATUS_STYLES[job.status as keyof typeof STATUS_STYLES] ?? STATUS_STYLES.default
              )}
            >
              {getStepIcon(job.type, iconSizeClasses[size])}
            </div>
          ))}
          {hasRemainingJobs && (
            <div
              className={cn(
                'flex items-center justify-center rounded-lg border-2 px-1 text-xs font-medium transition-all duration-200 hover:shadow-sm',
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

function getStepIcon(type?: StepTypeEnum, className?: string) {
  const Icon = STEP_TYPE_TO_ICON[type as keyof typeof STEP_TYPE_TO_ICON];
  return <Icon className={className || 'h-4 w-4'} />;
}

function getRemainingJobsStatus(jobs: IActivityJob[]): 'completed' | 'failed' | 'default' {
  const hasFailedJob = jobs.some((job) => job.status === JobStatusEnum.FAILED);
  const allCompleted = jobs.every((job) => job.status === JobStatusEnum.COMPLETED);

  if (hasFailedJob) return 'failed';
  if (allCompleted) return 'completed';

  return 'default';
}
