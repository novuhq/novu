import { motion } from 'motion/react';
import { TopicSubscription } from '@/api/topics';
import { Skeleton } from '@/components/primitives/skeleton';
import { useFetchSubscriberSubscriptions } from '@/hooks/use-fetch-subscriber-subscriptions';
import { itemVariants, listVariants } from '@/utils/animation';
import { SubscriptionItem } from './subscription-item';
import { SubscriptionsEmptyState } from './subscriptions-empty-state';

type SubscriberSubscriptionsProps = {
  subscriberId: string;
};

export function SubscriberSubscriptions({ subscriberId }: SubscriberSubscriptionsProps) {
  const { data, isPending } = useFetchSubscriberSubscriptions({
    subscriberId,
  });

  if (isPending) {
    return (
      <div className="flex h-full w-full flex-col border-t border-t-neutral-200 p-4">
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-[62px] w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const subscriptions = data?.data || [];

  if (subscriptions.length === 0) {
    return <SubscriptionsEmptyState />;
  }

  return (
    <motion.div
      key="subscription-list"
      className="flex h-full w-full flex-col border-t border-t-neutral-200"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{
        duration: 0.15,
        ease: [0.4, 0, 0.2, 1],
      }}
    >
      <motion.div className="flex flex-col" initial="hidden" animate="visible" variants={listVariants}>
        {subscriptions.map((subscription: TopicSubscription) => (
          <motion.div key={subscription._id} variants={itemVariants}>
            <SubscriptionItem subscription={subscription} />
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}
