import { motion } from 'motion/react';
import { RiPlayCircleLine, RiFullscreenLine, RiCodeBlock, RiCloseFill } from 'react-icons/ri';
import { IActivity, IEnvironment } from '@novu/shared';
import { useState, useRef } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';

import { cn } from '@/utils/ui';
import { InlineToast } from '@/components/primitives/inline-toast';
import { ActivityJobItem } from '@/components/activity/activity-job-item';
import { fadeIn } from '@/utils/animation';
import { Popover, PopoverContent, PopoverTrigger, PopoverClose } from '@/components/primitives/popover';
import { CodeBlock } from '@/components/primitives/code-block';
import { Dialog, DialogContent, DialogTitle, DialogClose, DialogHeader } from '@/components/primitives/dialog';
import { CopyToClipboard } from '../primitives/copy-to-clipboard';
import { Button } from '@/components/primitives/button';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { triggerWorkflow } from '../../api/workflows';
import { QueryKeys } from '@/utils/query-keys';
import { getActivityList } from '@/api/activity';
import { useEnvironment } from '@/context/environment/hooks';
import { RepeatPlay } from '../icons/repeat-play';
import { CompactButton } from '../primitives/button-compact';

export function ActivityLogs({
  activity,
  className,
  onActivitySelect,
  onTransactionIdChange,
  children,
}: {
  activity: IActivity;
  className?: string;
  onActivitySelect: (activityId: string) => void;
  onTransactionIdChange?: (transactionId: string, activityId: string) => void;
  children?: React.ReactNode;
}): JSX.Element {
  const isMerged = activity.jobs.some((job) => job.status === 'merged');
  const { jobs, payload } = activity;
  const [isFullscreenOpen, setIsFullscreenOpenState] = useState(false);
  const popoverCloseRef = useRef<HTMLButtonElement>(null);
  const queryClient = useQueryClient();
  const { currentEnvironment } = useEnvironment();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const workflowExists = !!activity?.template;

  const resentMetadata = {
    __resent_transaction_id: activity.transactionId,
    __resent_at: new Date().toISOString(),
  };
  const resentPayload = payload ? { ...payload, ...resentMetadata } : resentMetadata;
  const formattedPayload = payload ? JSON.stringify(payload, null, 2) : '{}';

  const setIsFullscreenOpen = (isOpen: boolean) => {
    if (isOpen && popoverCloseRef.current) {
      popoverCloseRef.current.click();
    }

    setIsFullscreenOpenState(isOpen);
  };

  const closePopover = () => {
    if (popoverCloseRef.current) {
      popoverCloseRef.current.click();
    }

    setIsPopoverOpen(false);
  };

  const { mutate: handleResend, isPending } = useMutation({
    mutationFn: async () => {
      const {
        data: { transactionId: newTransactionId },
      } = await triggerWorkflow({
        name: activity.template?.triggers[0].identifier ?? '',
        to: activity.subscriber?.subscriberId,
        payload: resentPayload,
        environment: { _id: activity._environmentId } as IEnvironment,
      });

      if (!newTransactionId) {
        throw new Error(
          `Workflow ${activity.template?.name} cannot be triggered. Ensure that it is active and requires not further actions`
        );
      }

      return newTransactionId;
    },
    onSuccess: async (newTransactionId) => {
      closePopover();
      setIsFullscreenOpen(false);

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
              queryKey: [QueryKeys.fetchActivities, activity._environmentId],
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
    <>
      <motion.div
        {...fadeIn}
        className={cn('flex items-center justify-between border-b border-t border-neutral-100 p-2 px-3', className)}
      >
        <div className="flex items-center gap-2">
          <RiPlayCircleLine className="h-3 w-3" />
          <span className="text-foreground-950 text-sm font-medium">Logs</span>
        </div>

        <Popover modal={true} open={isPopoverOpen} onOpenChange={(open) => setIsPopoverOpen(open)}>
          <PopoverTrigger asChild>
            <div className="flex items-center gap-1">
              <RiCodeBlock className="size-3" />
              <button
                className="text-foreground-600 hover:text-foreground-950 text-xs underline transition-colors"
                onClick={(e) => {
                  e.preventDefault();
                  setIsPopoverOpen(true);
                }}
              >
                View request payload
              </button>
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0" align="center" side="left">
            <div className="flex items-center justify-between border-b border-neutral-100 p-3">
              <h3 className="text-foreground-950 text-sm font-medium">Request payload</h3>
              <div className="flex items-center gap-2">
                {workflowExists && (
                  <Button
                    variant="secondary"
                    mode="ghost"
                    size="sm"
                    onClick={() => handleResend()}
                    className="text-xs"
                    disabled={isPending}
                    type="button"
                  >
                    <RepeatPlay className={cn('size-3', { 'text-text-disabled opacity-50': isPending })} />
                    Resend
                  </Button>
                )}
                <PopoverClose asChild ref={popoverCloseRef}>
                  <CompactButton size="md" variant="ghost" icon={RiCloseFill} type="button">
                    <span className="sr-only">Close</span>
                  </CompactButton>
                </PopoverClose>
              </div>
            </div>
            <div className="flex flex-col p-3">
              <CodeBlock
                code={formattedPayload}
                language="json"
                theme="light"
                className="h-[400px]"
                actionButtons={
                  <ActionButtons formattedPayload={formattedPayload} setIsFullscreenOpen={setIsFullscreenOpen} />
                }
              />
            </div>
          </PopoverContent>
        </Popover>
      </motion.div>

      {isMerged && (
        <motion.div {...fadeIn} className="px-3 py-3">
          <InlineToast
            ctaClassName="text-foreground-950"
            variant={'tip'}
            ctaLabel="View Execution"
            onCtaClick={(e) => {
              e.stopPropagation();
              e.preventDefault();

              if (activity._digestedNotificationId) {
                onActivitySelect(activity._digestedNotificationId);
              }
            }}
            description="Remaining execution has been merged to an active Digest of an existing workflow execution."
          />
        </motion.div>
      )}
      <motion.div {...fadeIn} className="flex flex-1 flex-col gap-6 overflow-y-auto bg-white p-3">
        {jobs.map((job, index) => (
          <ActivityJobItem key={job._id} job={job} isFirst={index === 0} isLast={index === jobs.length - 1} />
        ))}
        {children}
      </motion.div>

      <Dialog modal={false} open={isFullscreenOpen} onOpenChange={setIsFullscreenOpen}>
        <DialogContent className="flex max-h-[90vh] w-[90%] flex-col overflow-hidden p-0 [&>button.absolute.right-4.top-4]:hidden">
          <DialogHeader className="flex-none border-b border-neutral-100 p-3">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-foreground-950 text-sm font-medium">Request payload</DialogTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  mode="ghost"
                  size="xs"
                  onClick={() => handleResend()}
                  className="text-xs"
                  disabled={isPending}
                  type="button"
                >
                  <RepeatPlay className={cn('size-3', isPending && 'text-text-disabled opacity-50')} />
                  Resend
                </Button>
                <DialogClose asChild>
                  <CompactButton size="md" variant="ghost" icon={RiCloseFill} type="button">
                    <span className="sr-only">Close</span>
                  </CompactButton>
                </DialogClose>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-auto p-3">
            <CodeBlock
              code={formattedPayload}
              language="json"
              theme="light"
              className="h-full"
              actionButtons={<CopyToClipboard content={formattedPayload} theme="light" title="Copy code" />}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ActionButtons({
  formattedPayload,
  setIsFullscreenOpen,
}: {
  formattedPayload: string;
  setIsFullscreenOpen: (isOpen: boolean) => void;
}) {
  const handleFullscreenClick = () => {
    setIsFullscreenOpen(true);
  };

  return (
    <div className="flex items-center gap-1">
      <CopyToClipboard content={formattedPayload} theme="light" title="Copy code" />
      <button
        onClick={handleFullscreenClick}
        className="text-text-sub hover:bg-bg-weak inline-flex select-none items-center justify-center whitespace-nowrap p-2.5 outline-none transition duration-200 ease-out"
      >
        <RiFullscreenLine className="size-3" />
      </button>
    </div>
  );
}
