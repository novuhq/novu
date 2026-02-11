import { motion } from 'motion/react';
import { useState } from 'react';
import { RiDiscussLine, RiMindMap, RiPulseFill } from 'react-icons/ri';
import { TopicSubscriptionDetailsResponse } from '@/api/topics';
import { Button } from '@/components/primitives/button';
import { CopyButton } from '@/components/primitives/copy-button';
import { Skeleton } from '@/components/primitives/skeleton';
import { TopicDrawer } from '@/components/topics/topic-drawer';
import TruncatedText from '@/components/truncated-text';
import { fadeIn } from '@/utils/animation';
import { cn } from '@/utils/ui';
import { SubscriptionPreferenceRule } from './subscription-preference-rule';

type SubscriptionPreferencesProps = {
  isLoading: boolean;
  topicKey?: string;
  subscription?: TopicSubscriptionDetailsResponse;
  subscriberId?: string;
};

interface SubscriptionOverviewProps {
  children?: React.ReactNode;
  className?: string;
  isCopyable?: boolean;
  label: string;
  value?: string;
}

const SubscriptionOverview = ({ children, className, isCopyable, label, value }: SubscriptionOverviewProps) => {
  return (
    <div className={cn('flex items-center justify-between gap-2 overflow-hidden', className)}>
      <span className="text-text-soft font-code shrink-0 text-xs font-medium">{label}</span>
      <div className="relative flex min-w-0 items-center gap-2 overflow-hidden">
        {isCopyable && value && <CopyButton valueToCopy={value} size="2xs" className="h-1 shrink-0 p-0.5" />}
        <span className="text-foreground-600 truncate font-mono text-xs" title={value}>
          {children ?? value}
        </span>
      </div>
    </div>
  );
};

export const SubscriptionPreferences = ({
  isLoading,
  topicKey,
  subscription,
  subscriberId,
}: SubscriptionPreferencesProps) => {
  const [openTopicDrawer, setOpenTopicDrawer] = useState(false);

  if (isLoading || !subscription || !topicKey || !subscriberId) {
    return (
      <div className="flex h-full flex-col">
        <header className="border-bg-soft flex h-12 w-full shrink-0 flex-row items-center gap-3 border-b px-3 py-4">
          <div className="flex flex-1 items-center gap-1 overflow-hidden text-sm font-medium">
            <RiMindMap className="size-5 p-0.5" />
            <TruncatedText className="flex-1 pr-10">Subscription preferences</TruncatedText>
          </div>
        </header>
        <div className="flex min-h-0 flex-1 flex-col overflow-auto">
          <div className="flex flex-col gap-2 border-b border-bg-soft p-4">
            <motion.div {...fadeIn}>
              <div className="mb-2 flex flex-col gap-[12px]">
                <SubscriptionOverview label="Subscription" value={''}>
                  <Skeleton className="h-4 w-48" />
                </SubscriptionOverview>
                <SubscriptionOverview label="Topic key" value={''}>
                  <Skeleton className="h-4 w-48" />
                </SubscriptionOverview>
                <SubscriptionOverview label="SubscriberID" value={''}>
                  <Skeleton className="h-4 w-48" />
                </SubscriptionOverview>
              </div>
            </motion.div>
          </div>
          <div className="flex flex-col gap-2 px-3 py-2 border-b border-bg-soft">
            <span className="text-xs font-medium">Preference rules</span>
          </div>
          <div className="flex flex-col gap-2 p-3">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="size-4" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="size-4" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="size-4" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="size-4" />
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2 border-t border-bg-soft p-3">
          <span className="text-xs font-medium text-text-soft">Quick actions</span>
          <div className="flex gap-2">
            <Button variant="secondary" size="2xs" mode="outline" leadingIcon={RiDiscussLine} disabled>
              View topic
            </Button>
            <Button variant="secondary" size="2xs" mode="outline" leadingIcon={RiPulseFill} disabled>
              View subscription activity
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex h-full flex-col">
        <header className="border-bg-soft flex h-12 w-full shrink-0 flex-row items-center gap-3 border-b px-3 py-4">
          <div className="flex flex-1 items-center gap-1 overflow-hidden text-sm font-medium">
            <RiMindMap className="size-5 p-0.5" />
            <TruncatedText className="flex-1 pr-10">Subscription preferences</TruncatedText>
          </div>
        </header>
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex flex-col gap-2 border-b border-bg-soft p-4">
            <motion.div {...fadeIn}>
              <div className="mb-2 flex flex-col gap-[12px]">
                <SubscriptionOverview
                  label="Subscription"
                  value={subscription.identifier ?? subscription.id}
                  isCopyable
                />
                <SubscriptionOverview label="Topic key" value={topicKey} isCopyable />
                <SubscriptionOverview label="SubscriberID" value={subscriberId} isCopyable />
              </div>
            </motion.div>
          </div>
          <div className="flex flex-col gap-2 px-3 py-2 border-b border-bg-soft">
            <span className="text-xs font-medium">Preference rules</span>
          </div>
          <div className="flex flex-col gap-2 p-3 overflow-auto">
            {subscription.preferences.map((preference) => (
              <SubscriptionPreferenceRule key={preference.workflow.id} preference={preference} />
            ))}
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2 border-t border-bg-soft p-3">
          <span className="text-xs font-medium text-text-soft">Quick actions</span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="2xs"
              mode="outline"
              leadingIcon={RiDiscussLine}
              onClick={() => setOpenTopicDrawer(true)}
            >
              View topic
            </Button>
            {/** TODO: implement subscription activity button */}
            <Button variant="secondary" size="2xs" mode="outline" leadingIcon={RiPulseFill}>
              View subscription activity
            </Button>
          </div>
        </div>
      </div>
      <TopicDrawer open={openTopicDrawer} onOpenChange={setOpenTopicDrawer} topicKey={topicKey} readOnly />
    </>
  );
};
