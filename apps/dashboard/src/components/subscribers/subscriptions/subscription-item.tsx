import { format } from 'date-fns';
import { motion } from 'motion/react';
import { TopicSubscription } from '@/api/topics';
import { TimeDisplayHoverCard } from '@/components/time-display-hover-card';
import { TopicDrawerButton } from '@/components/topics/topic-drawer';
import TruncatedText from '@/components/truncated-text';
import { cn } from '@/utils/ui';

type SubscriptionItemProps = {
  subscription: TopicSubscription;
};

export function SubscriptionItem({ subscription }: SubscriptionItemProps) {
  return (
    <TopicDrawerButton topicKey={subscription.topic.key} className={cn('w-full text-left')}>
      <motion.div
        layout
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{
          duration: 0.2,
          ease: [0.4, 0, 0.2, 1],
        }}
        className={cn(
          'border-bg-soft flex flex-row items-center justify-between gap-2 border-b px-4 py-3 transition-colors hover:bg-slate-50'
        )}
      >
        <div className="flex flex-1 flex-row items-center gap-2 overflow-hidden">
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="text-foreground-900 text-label-xs font-medium">
              <TruncatedText>{subscription.topic.name || subscription.topic.key}</TruncatedText>
            </div>
            <div className="text-foreground-600 text-label-2xs font-code">
              <TruncatedText>{subscription.topic.key}</TruncatedText>
            </div>
          </div>
        </div>
        {subscription.createdAt && (
          <TimeDisplayHoverCard date={subscription.createdAt} className="text-label-xs text-foreground-600">
            {format(new Date(subscription.createdAt), 'MMM d, yyyy')}
          </TimeDisplayHoverCard>
        )}
      </motion.div>
    </TopicDrawerButton>
  );
}
