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
import { ISubscriber } from '@novu/shared';
import { motion } from 'motion/react';
import { useState } from 'react';
import { RiDeleteBinLine, RiMailLine, RiUser3Fill } from 'react-icons/ri';
import { SubscriberDrawerButton } from '../subscribers/subscriber-drawer';
import { useRemoveTopicSubscriber } from './hooks/use-topic-subscribers';

interface TopicSubscriberItemProps {
  subscriber: ISubscriber;
  topicKey: string;
  readOnly?: boolean;
}

export function TopicSubscriberItem({ subscriber, topicKey, readOnly = false }: TopicSubscriberItemProps) {
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
      subscriberId: subscriber.subscriberId,
    });

    setConfirmDialogOpen(false);
  };

  const getDisplayName = () => {
    if (subscriber.firstName || subscriber.lastName) {
      return `${subscriber.firstName || ''} ${subscriber.lastName || ''}`.trim();
    }

    return null;
  };

  const displayName = getDisplayName();

  return (
    <>
      <SubscriberDrawerButton subscriberId={subscriber.subscriberId} readOnly>
        <motion.div
          variants={itemVariants}
          className="border-b-stroke-soft group flex w-full cursor-pointer border-b last:border-b-0 hover:bg-neutral-50"
        >
          <div className="flex w-full items-center justify-between px-3 py-2">
            <div className="flex flex-col">
              <div className="flex items-center">
                <RiUser3Fill className="mr-2 size-3.5 min-w-3.5 text-neutral-500" />
                <span className="text-label-xs text-foreground-950 font-medium">
                  {displayName || subscriber.subscriberId}
                </span>
                {displayName && (
                  <span className="text-label-xs ml-2 text-neutral-500">({subscriber.subscriberId})</span>
                )}
              </div>

              {subscriber.email && (
                <div className="ml-5 mt-1 flex items-center">
                  <RiMailLine className="mr-1.5 size-3 min-w-3 text-neutral-400" />
                  <span className="text-label-xs text-neutral-500">{subscriber.email}</span>
                </div>
              )}
            </div>

            {!readOnly && (
              <div className="opacity-0 transition-opacity duration-200 group-hover:opacity-100">
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

      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Remove Subscriber</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{' '}
              <span className="font-medium">{displayName || subscriber.subscriberId}</span> from this topic? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" mode="outline" onClick={() => setConfirmDialogOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="error" onClick={confirmRemove} isLoading={isPending}>
              {isPending ? 'Removing...' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
