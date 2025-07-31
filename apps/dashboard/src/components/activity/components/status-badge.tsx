import { type IActivityJob, JobStatusEnum } from '@novu/shared';
import { StatusBadge as StatusBadgeComponent, StatusBadgeIcon } from '../../primitives/status-badge';
import { JOB_STATUS_CONFIG } from '../constants';
import { getActivityStatus } from '../helpers';

export interface StatusBadgeProps {
  jobs: IActivityJob[];
}

export function ActivityStatusBadge({ jobs }: StatusBadgeProps) {
  const status = getActivityStatus(jobs);
  const { variant, icon: Icon } = JOB_STATUS_CONFIG[status] || JOB_STATUS_CONFIG[JobStatusEnum.PENDING];

  return (
    <StatusBadgeComponent variant="stroke" status={variant} className="h-4 w-4 border-0 px-0 ring-0">
      <StatusBadgeIcon as={Icon} />
    </StatusBadgeComponent>
  );
}
