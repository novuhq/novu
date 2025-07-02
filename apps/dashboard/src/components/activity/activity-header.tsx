import { motion } from 'motion/react';
import { RiRouteFill, RiCloseLine } from 'react-icons/ri';
import { IActivity, IEnvironment } from '@novu/shared';
import { useQueryClient, useMutation } from '@tanstack/react-query';

import { cn } from '@/utils/ui';
import { fadeIn } from '@/utils/animation';
import { Button } from '@/components/primitives/button';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { triggerWorkflow } from '../../api/workflows';
import { QueryKeys } from '@/utils/query-keys';
import { getActivityList } from '@/api/activity';
import { useEnvironment } from '@/context/environment/hooks';
import { RepeatPlay } from '../icons/repeat-play';

type ActivityHeaderProps = {
  className?: string;
  activity?: IActivity;
  onTransactionIdChange?: (transactionId: string, activityId: string) => void;
  onClose?: () => void;
};

export const ActivityHeader = ({ className, activity, onTransactionIdChange, onClose }: ActivityHeaderProps) => {
  const queryClient = useQueryClient();
  const { currentEnvironment } = useEnvironment();

  const resentMetadata = activity?.payload
    ? {
        __resent_transaction_id: activity.transactionId,
        __resent_at: new Date().toISOString(),
      }
    : {};

  const resentPayload = activity?.payload ? { ...activity.payload, ...resentMetadata } : resentMetadata;
  const workflowExists = !!activity?.template;

  const { mutate: handleResend, isPending } = useMutation({
    mutationFn: async () => {
      if (!activity) throw new Error('No activity data available');

      const {
        data: { transactionId: newTransactionId },
      } = await triggerWorkflow({
        name: activity.template?.triggers[0].identifier ?? '',
        to: activity.subscriber?.subscriberId,
        payload: resentPayload,
        environment: currentEnvironment!,
      });

      if (!newTransactionId) {
        throw new Error(
          `Workflow ${activity.template?.name} cannot be triggered. Ensure that it is active and requires not further actions`
        );
      }

      return newTransactionId;
    },
    onSuccess: async (newTransactionId) => {
      showSuccessToast(
        `A new notification has been triggered with transaction ID: ${newTransactionId}`,
        'Notification resent successfully'
      );

      const checkAndUpdateTransaction = async () => {
        if (currentEnvironment) {
          const { data: activities } = await getActivityList({
            environment: currentEnvironment,
            page: 0,
            limit: 1,
            filters: {
              transactionId: newTransactionId,
            },
          });

          if (activities.length > 0) {
            queryClient.invalidateQueries({
              queryKey: [QueryKeys.fetchActivities, activity?._environmentId],
            });
            onTransactionIdChange?.(newTransactionId, activities[0]._id);
          }
        }
      };

      setTimeout(checkAndUpdateTransaction, 1000);
    },
    onError: (error: Error) => {
      showErrorToast(
        error.message || 'There was an error triggering the resend workflow.',
        'Failed to trigger resend workflow'
      );
    },
  });

  return (
    <motion.header
      {...fadeIn}
      className={cn(
        'bg-bg-weak border-stroke-soft flex items-center justify-between gap-1.5 border-b px-2 py-1.5',
        className
      )}
    >
      <div className="flex items-center gap-1.5">
        <RiRouteFill className="h-3 w-3" />
        <span className="text-foreground-950 text-sm font-medium">Workflow run</span>
      </div>

      <div className="flex items-center gap-1.5">
        {activity && workflowExists && (
          <Button
            variant="secondary"
            mode="ghost"
            size="2xs"
            onClick={() => handleResend()}
            className="h-[20px]"
            isLoading={isPending}
            type="button"
            trailingIcon={RepeatPlay}
          >
            Resend
          </Button>
        )}
        {onClose && (
          <Button
            variant="secondary"
            mode="ghost"
            size="2xs"
            onClick={onClose}
            className="h-[20px]"
            type="button"
            trailingIcon={RiCloseLine}
          ></Button>
        )}
      </div>
    </motion.header>
  );
};
