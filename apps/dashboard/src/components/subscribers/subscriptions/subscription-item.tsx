import { TopicSubscription } from '@/api/topics';
import { cn } from '@/utils/ui';
import { motion } from 'motion/react';
import { RiMailSettingsLine } from 'react-icons/ri';
import TruncatedText from '@/components/truncated-text';

type SubscriptionItemProps = {
  subscription: TopicSubscription;
};

export function SubscriptionItem({ subscription }: SubscriptionItemProps) {
  return (
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
        'border-bg-soft flex flex-row items-center justify-between gap-2 border-b px-4 py-3 transition-colors'
      )}
    >
      <div className="flex flex-1 flex-row items-center gap-2 overflow-hidden">
        <div className="bg-background-soft text-foreground-600 flex size-9 items-center justify-center rounded-full">
          <RiMailSettingsLine className="size-4" />
        </div>
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="text-foreground-900 text-sm font-medium">
            <TruncatedText>{subscription.topic.name || subscription.topic.key}</TruncatedText>
          </div>
          <div className="text-foreground-600 text-xs">
            <TruncatedText>{subscription.topic.key}</TruncatedText>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
