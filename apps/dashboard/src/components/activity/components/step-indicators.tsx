import { cn } from '@/utils/ui';
import { STATUS_STYLES } from '../constants';
import { IActivityJob, JobStatusEnum, StepTypeEnum } from '@novu/shared';
import { STEP_TYPE_TO_ICON } from '@/components/icons/utils';

export interface StepIndicatorsProps {
  jobs: IActivityJob[];
}

export function StepIndicators({ jobs }: StepIndicatorsProps) {
  const visibleJobs = jobs.slice(0, 4);
  const remainingJobs = jobs.slice(4);
  const hasRemainingJobs = remainingJobs.length > 0;
  const remainingJobsStatus = getRemainingJobsStatus(remainingJobs);

  return (
    <div className="flex items-center">
      {visibleJobs.map((job) => (
        <div
          key={job._id}
          className={cn(
            '-ml-2 flex h-7 w-7 items-center justify-center rounded-full border first:ml-0',
            STATUS_STYLES[job.status as keyof typeof STATUS_STYLES] ?? STATUS_STYLES.default
          )}
        >
          {getStepIcon(job.type)}
        </div>
      ))}
      {hasRemainingJobs && (
        <div
          className={cn(
            '-ml-2 flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-xs font-medium',
            STATUS_STYLES[remainingJobsStatus]
          )}
        >
          +{remainingJobs.length}
        </div>
      )}
    </div>
  );
}

function getStepIcon(type?: StepTypeEnum) {
  const Icon = STEP_TYPE_TO_ICON[type as keyof typeof STEP_TYPE_TO_ICON];

  return <Icon className="h-4 w-4" />;
}

function getRemainingJobsStatus(jobs: IActivityJob[]): 'completed' | 'failed' | 'default' {
  const hasFailedJob = jobs.some((job) => job.status === JobStatusEnum.FAILED);
  const allCompleted = jobs.every((job) => job.status === JobStatusEnum.COMPLETED);

  if (hasFailedJob) return 'failed';
  if (allCompleted) return 'completed';

  return 'default';
}
