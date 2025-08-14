import type { ISubscriber } from '@novu/shared';
import { TableCell, TableRow } from '@/components/primitives/table';
import { formatDateSimple } from '@/utils/format-date';
import { cn } from '@/utils/ui';
import { ActivityStatusBadge } from './status-badge';
import { StepIndicators } from './step-indicators';

type ActivityTableRowProps = {
  activity: any;
  isSelected?: boolean;
  onClick?: (activityId: string) => void;
  className?: string;
};

function truncateText(text: string, maxLength: number = 26): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

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

  if (subscriber.subscriberId) {
    return subscriber.subscriberId;
  }

  return '';
}

export function ActivityTableRow({ activity, isSelected, onClick, className }: ActivityTableRowProps) {
  const handleClick = () => {
    onClick?.(activity._id);
  };

  const subscriberDisplay = getSubscriberDisplay(
    activity.subscriber as Pick<ISubscriber, '_id' | 'subscriberId' | 'firstName' | 'lastName'>
  );
  const truncatedTransactionId = truncateText(activity.transactionId);
  const truncatedSubscriberDisplay = subscriberDisplay ? truncateText(subscriberDisplay) : '';

  return (
    <TableRow
      className={cn('relative cursor-pointer hover:bg-neutral-50', isSelected && 'bg-neutral-50', className)}
      onClick={handleClick}
    >
      <TableCell className="p-1.5">
        <div className="flex flex-col">
          <span className="text-foreground-950 text-label-xs flex items-center gap-1">
            <div className="relative flex items-center justify-center gap-0.5">
              <ActivityStatusBadge jobs={activity.jobs} />
            </div>
            {activity.template?.name || 'Deleted workflow'}
          </span>
          <span className="text-foreground-400 text-[10px] leading-[14px]">
            <div
              className="bg-bg-weak font-code inline-block rounded-sm px-1.5"
              title={`${activity.transactionId}${subscriberDisplay ? ` • ${subscriberDisplay}` : ''}`}
            >
              {truncatedTransactionId}
              {truncatedSubscriberDisplay ? ` • ${truncatedSubscriberDisplay}` : ''}
            </div>
          </span>
        </div>
      </TableCell>

      <TableCell className="flex flex-col p-1.5 text-right">
        <span className="text-text-soft font-code mb-0.5 text-[11px] font-normal leading-normal">
          {formatDateSimple(activity.createdAt)}
        </span>
        <div className="ml-auto gap-1 text-right">
          <StepIndicators jobs={activity.jobs} size="sm" />
        </div>
      </TableCell>
    </TableRow>
  );
}
