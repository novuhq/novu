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
import { motion } from 'motion/react';
import { useState } from 'react';
import { RiDeleteBinLine, RiUser3Fill } from 'react-icons/ri';
import { SubscriberDrawerButton } from '../subscribers/subscriber-drawer';
import { useRemoveTopicSubscriber } from './hooks/use-topic-subscribers';

interface TopicSubscriberItemProps {
  subscriberId: string;
  topicKey: string;
  readOnly?: boolean;
}

export function TopicSubscriberItem({ subscriberId, topicKey, readOnly = false }: TopicSubscriberItemProps) {
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
      subscriberId,
    });

    setConfirmDialogOpen(false);
  };

  return (
    <>
      <SubscriberDrawerButton subscriberId={subscriberId} readOnly>
        <motion.div
          variants={itemVariants}
          className="border-b-stroke-soft group flex w-full cursor-pointer border-b last:border-b-0 hover:bg-neutral-50"
        >
          <div className="flex w-full items-center justify-between px-3 py-2">
            <div className="flex items-center">
              <RiUser3Fill className="mr-2 size-3.5 min-w-3.5 text-neutral-500" />
              <span className="text-label-xs text-foreground-950">{subscriberId}</span>
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
              Are you sure you want to remove <span className="font-medium">{subscriberId}</span> from this topic? This
              action cannot be undone.
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
