import { FeatureFlagsKeysEnum } from '@novu/shared';
import { motion } from 'motion/react';
import { useState } from 'react';
import { TopicSubscription } from '@/api/topics';
import { ConfirmationModal } from '@/components/confirmation-modal';
import { ContextFilter } from '@/components/contexts/context-filter';
import { Skeleton } from '@/components/primitives/skeleton';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { SidebarContent } from '@/components/side-navigation/sidebar';
import { TopicDrawer } from '@/components/topics/topic-drawer';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useFetchSubscriberSubscriptions } from '@/hooks/use-fetch-subscriber-subscriptions';
import { itemVariants, listVariants } from '@/utils/animation';
import { useDeleteSubscription } from '../hooks/use-delete-subscription';
import { SubscriptionItem } from './subscription-item';
import { SubscriptionPreferencesDrawer } from './subscription-preferences-drawer';
import { SubscriptionsEmptyState } from './subscriptions-empty-state';

type SubscriberSubscriptionsProps = {
  subscriberId: string;
};

export function SubscriberSubscriptions({ subscriberId }: SubscriberSubscriptionsProps) {
  const isContextPreferencesEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_CONTEXT_PREFERENCES_ENABLED);
  const [contextKeys, setContextKeys] = useState<string[]>(['']);

  const { data, isPending } = useFetchSubscriberSubscriptions({
    subscriberId,
    contextKeys: isContextPreferencesEnabled ? contextKeys : undefined,
  });
  const { mutateAsync: deleteSubscription } = useDeleteSubscription();
  const [selectedSubscription, setSelectedSubscription] = useState<TopicSubscription | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isTopicDrawerOpen, setIsTopicDrawerOpen] = useState(false);
  const [isSubscriptionPreferencesDrawerOpen, setIsSubscriptionPreferencesDrawerOpen] = useState(false);

  const handleDeleteSubscription = (subscription: TopicSubscription) => {
    setSelectedSubscription(subscription);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDeleteSubscription = async () => {
    if (!selectedSubscription) return;

    setIsDeleteModalOpen(false);
    setSelectedSubscription(null);
    await deleteSubscription(
      {
        topicKey: selectedSubscription.topic.key,
        identifier: selectedSubscription.identifier,
        subscriberId: selectedSubscription.subscriber.subscriberId,
      },
      {
        onSuccess: () => {
          showSuccessToast('The subscription has been successfully deleted');
        },
        onError: (error) => {
          showErrorToast(`Error deleting subscription: ${(error as Error).message}`);
        },
      }
    );
  };

  const handleViewTopic = (subscription: TopicSubscription) => {
    setSelectedSubscription(subscription);
    setIsTopicDrawerOpen(true);
  };

  const handleViewSubscriptionPreferences = (subscription: TopicSubscription) => {
    setSelectedSubscription(subscription);
    setIsSubscriptionPreferencesDrawerOpen(true);
  };

  const subscriptions = data?.data || [];

  return (
    <>
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
        {isContextPreferencesEnabled && (
          <SidebarContent size="md" className="min-h-max overflow-x-auto border-b border-neutral-200 py-2 px-2">
            <div className="flex items-center gap-2">
              <ContextFilter contextKeys={contextKeys} onContextKeysChange={setContextKeys} defaultOnClear={true} />
            </div>
          </SidebarContent>
        )}

        {isPending ? (
          <div className="flex h-full w-full flex-col p-4">
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-[62px] w-full rounded-lg" />
              ))}
            </div>
          </div>
        ) : subscriptions.length === 0 ? (
          <SubscriptionsEmptyState />
        ) : (
          <motion.div className="flex flex-col" initial="hidden" animate="visible" variants={listVariants}>
            {subscriptions.map((subscription: TopicSubscription) => (
              <motion.div key={subscription._id} variants={itemVariants}>
                <SubscriptionItem
                  subscription={subscription}
                  onDeleteSubscription={handleDeleteSubscription}
                  onViewTopic={handleViewTopic}
                  onViewSubscriptionPreferences={handleViewSubscriptionPreferences}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>
      <TopicDrawer
        open={isTopicDrawerOpen}
        className={'w-3/4 sm:max-w-[540px] **:data-[close-button="true"]:hidden'}
        onOpenChange={(open) => {
          setIsTopicDrawerOpen(open);
          if (!open) {
            setSelectedSubscription(null);
          }
        }}
        topicKey={selectedSubscription?.topic.key ?? ''}
        readOnly
      />
      <SubscriptionPreferencesDrawer
        open={isSubscriptionPreferencesDrawerOpen}
        className={'w-3/4 sm:max-w-[540px]'}
        onOpenChange={(open) => {
          setIsSubscriptionPreferencesDrawerOpen(open);
          if (!open) {
            setSelectedSubscription(null);
          }
        }}
        topicKey={selectedSubscription?.topic.key}
        subscriptionId={selectedSubscription?._id}
        subscriberId={selectedSubscription?.subscriber.subscriberId}
      />
      <ConfirmationModal
        open={isDeleteModalOpen}
        onOpenChange={(open) => {
          setIsDeleteModalOpen(open);
          if (!open) {
            setSelectedSubscription(null);
          }
        }}
        onConfirm={handleConfirmDeleteSubscription}
        title="Remove subscription"
        description="Are you sure you want to remove this subscription? This action cannot be undone."
        confirmButtonText="Remove subscription"
      />
    </>
  );
}
