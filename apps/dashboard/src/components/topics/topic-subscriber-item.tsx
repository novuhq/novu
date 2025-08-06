import { ISubscriber } from '@novu/shared';
import { format } from 'date-fns';
import { motion } from 'motion/react';
import { useState } from 'react';
import { RiDeleteBinLine, RiMailLine } from 'react-icons/ri';
import { TopicSubscription } from '@/api/topics';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/primitives/avatar';
import { Button } from '@/components/primitives/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/primitives/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { itemVariants } from '@/utils/animation';
import { ConfirmationModal } from '../confirmation-modal';
import { SubscriberDrawerButton } from '../subscribers/subscriber-drawer';
import { TimeDisplayHoverCard } from '../time-display-hover-card';
import TruncatedText from '../truncated-text';
import { useRemoveTopicSubscriber } from './hooks/use-topic-subscribers';

interface TopicSubscriberItemProps {
  topicKey: string;
  readOnly?: boolean;
  subscription: TopicSubscription;
}

export function TopicSubscriberItem({ topicKey, subscription, readOnly = false }: TopicSubscriberItemProps) {
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const { mutate: removeSubscriber, isPending } = useRemoveTopicSubscriber();

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setConfirmDialogOpen(true);
  };

  const confirmRemove = () => {
    if (isPending) return;

    removeSubscriber({
      topicKey,
      subscriberId: subscription.subscriber.subscriberId,
    });

    setConfirmDialogOpen(false);
  };

  const getDisplayName = () => {
    if (subscription.subscriber.firstName || subscription.subscriber.lastName) {
      return `${subscription.subscriber.firstName || ''} ${subscription.subscriber.lastName || ''}`.trim();
    }

    return null;
  };

  const displayName = getDisplayName();
  const subscriberTitle = displayName || subscription.subscriber.subscriberId;

  return (
    <>
      <SubscriberDrawerButton subscriberId={subscription.subscriber.subscriberId} readOnly>
        <motion.div
          variants={itemVariants}
          className="border-b-stroke-soft group flex w-full cursor-pointer border-b last:border-b-0 hover:bg-neutral-50"
        >
          <div className="grid w-full grid-cols-[150px_1fr_120px_auto] items-center px-3 py-2">
            <div className="flex max-w-[150px] items-center gap-3 overflow-hidden">
              <Avatar className="size-8">
                <AvatarImage src={subscription.subscriber.avatar || undefined} />
                <AvatarFallback>{subscriberTitle[0]}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start overflow-hidden">
                <span className="text-label-xs text-foreground-950 truncate font-medium">
                  {displayName || subscription.subscriber.subscriberId}
                </span>
                {subscription.subscriber.email && (
                  <div className="flex">
                    <span className="text-label-2xs truncate text-neutral-500">{subscription.subscriber.email}</span>
                  </div>
                )}
              </div>
            </div>

            <TruncatedText className="text-text-soft font-code flex-1 px-4 text-left text-[10px]">
              {subscription.subscriber.subscriberId}
            </TruncatedText>

            <div className="text-label-xs text-foreground-600 justify-self-end px-2">
              {subscription.createdAt && (
                <TimeDisplayHoverCard date={subscription.createdAt} className="text-[10px]">
                  {format(new Date(subscription.createdAt), 'MMM d, yyyy')}
                </TimeDisplayHoverCard>
              )}
            </div>

            {!readOnly && (
              <div className="justify-self-end opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="secondary"
                      mode="ghost"
                      size="2xs"
                      disabled={isPending}
                      onClick={handleRemove}
                      className="h-6 w-6 p-0"
                    >
                      <RiDeleteBinLine className="size-3.5 text-red-500" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Remove subscriber</TooltipContent>
                </Tooltip>
              </div>
            )}
          </div>
        </motion.div>
      </SubscriberDrawerButton>

      <ConfirmationModal
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        title="Remove Subscriber"
        description={
          <>
            Are you sure you want to remove{' '}
            <span className="font-medium">{displayName || subscription.subscriber.subscriberId}</span> from this topic?
            This action cannot be undone.
          </>
        }
        onConfirm={confirmRemove}
        confirmButtonText={'Remove'}
        isLoading={isPending}
      />
    </>
  );
}
