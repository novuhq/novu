import { TableCell, TableRow } from '@/components/primitives/table';
import { formatDateSimple } from '@/utils/format-date';
import { cn } from '@/utils/ui';
import { ISubscriber } from '@novu/shared';
import { ActivityStatusBadge } from './status-badge';
import { StepIndicators } from './step-indicators';

type ActivityTableRowProps = {
  activity: any;
  isSelected?: boolean;
  onClick?: (activityId: string) => void;
  variant?: 'default' | 'compact';
  className?: string;
};

function getSubscriberDisplay(
  subscriber?: Pick<ISubscriber, '_id' | 'subscriberId' | 'firstName' | 'lastName'>,
  variant: 'default' | 'compact' = 'default'
) {
  if (!subscriber) return variant === 'compact' ? 'Deleted' : '';

  if (variant === 'compact') {
    return subscriber.subscriberId || 'Deleted';
  }

  if (subscriber.firstName || subscriber.lastName) {
    return `${subscriber.firstName || ''} ${subscriber.lastName || ''}`.trim();
  }

  return '';
}

export function ActivityTableRow({
  activity,
  isSelected,
  onClick,
  variant = 'default',
  className,
}: ActivityTableRowProps) {
  const handleClick = () => {
    onClick?.(activity._id);
  };

  if (variant === 'compact') {
    return (
      <TableRow className={cn('h-[50px] cursor-pointer hover:bg-neutral-50', className)} onClick={handleClick}>
        <TableCell className="px-3 py-1.5">
          <div className="flex w-full flex-col items-end gap-0.5">
            <div className="w-full">
              <div className="flex w-full flex-row items-center gap-1">
                <ActivityStatusBadge jobs={activity.jobs} />
                <div className="flex-1">
                  <div className="text-left font-['Inter'] text-[12px] font-medium leading-[16px] text-[#0e121b]">
                    {activity.template?.name || 'Unknown Workflow'}
                  </div>
                </div>
                <div className="text-left font-['JetBrains_Mono'] text-[11px] font-normal leading-normal text-[#99a0ae]">
                  {formatDateSimple(activity.createdAt)}
                </div>
              </div>
            </div>

            <div className="w-full">
              <div className="flex w-full flex-row items-center gap-1">
                <div className="flex-1">
                  <div className="text-left font-['JetBrains_Mono'] text-[11px] font-normal leading-normal text-[#99a0ae]">
                    {activity.transactionId} - {getSubscriberDisplay(activity.subscriber, 'compact')}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <StepIndicators jobs={activity.jobs || []} size="sm" />
                </div>
              </div>
            </div>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow
      className={cn('relative cursor-pointer hover:bg-neutral-50', isSelected && 'bg-neutral-50', className)}
      onClick={handleClick}
    >
      <TableCell className="p-1.5">
        <div className="flex flex-col">
          <span className="text-foreground-950 text-label-xs flex items-center gap-1">
            <div className="relative top-[2px] flex items-center justify-center gap-0.5">
              <ActivityStatusBadge jobs={activity.jobs} />
            </div>
            {activity.template?.name || 'Deleted workflow'}
          </span>
          <span className="text-foreground-400 ml-[5px] text-[10px] leading-[14px]">
            {activity.transactionId} •{' '}
            {getSubscriberDisplay(
              activity.subscriber as Pick<ISubscriber, '_id' | 'subscriberId' | 'firstName' | 'lastName'>
            )}
          </span>
        </div>
      </TableCell>

      <TableCell className="flex flex-col p-1.5 text-right">
        <span className="text-text-soft text-xs font-normal leading-normal">
          {formatDateSimple(activity.createdAt)}
        </span>
        <div className="ml-auto gap-1 text-right">
          <StepIndicators jobs={activity.jobs} size="sm" />
        </div>
      </TableCell>
    </TableRow>
  );
}
