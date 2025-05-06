import { STEP_TYPE_TO_ICON } from '@/components/icons/utils';
import { STEP_TYPE_LABELS } from '@/utils/constants';
import { cn } from '@/utils/ui';
import { IActivityJob, JobStatusEnum, StepTypeEnum } from '@novu/shared';
import { format } from 'date-fns';
import { JOB_STATUS_CONFIG } from '../constants';

function getStepIcon(type?: StepTypeEnum) {
  const Icon = STEP_TYPE_TO_ICON[type as keyof typeof STEP_TYPE_TO_ICON];

  return <Icon className="h-4 w-4" />;
}

export interface StatusPreviewCardProps {
  jobs: IActivityJob[];
}

export function StatusPreviewCard({ jobs }: StatusPreviewCardProps) {
  return (
    <div className="flex flex-col gap-0.5">
      {jobs.map((job, index) => {
        const lastExecutionDetail = job.executionDetails?.at(-1);
        const status = job.status;
        const { color, label } = JOB_STATUS_CONFIG[status] || JOB_STATUS_CONFIG[JobStatusEnum.PENDING];
        const isLastItem = index === jobs.length - 1;

        return (
          <div
            key={job._id}
            className={cn(
              'hover:bg-muted-50 flex items-center gap-1.5 rounded px-1 py-1',
              !isLastItem && 'border-border/40 border-b'
            )}
          >
            <div className={cn('flex h-5 w-5 items-center justify-center rounded-full')}>{getStepIcon(job.type)}</div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-medium">{STEP_TYPE_LABELS[job.type!] || job.type}</span>
                <span className={cn('rounded-full text-[10px] font-medium', 'text-' + color)}>{label}</span>
              </div>

              {lastExecutionDetail?.detail && (
                <div className="text-foreground-500 truncate text-[11px]">{lastExecutionDetail.detail}</div>
              )}
            </div>

            {job.createdAt && (
              <div className="text-foreground-400 text-[10px] tabular-nums">
                {format(new Date(job.createdAt), 'HH:mm')}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
