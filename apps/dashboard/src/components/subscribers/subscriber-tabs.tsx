import { FeatureFlagsKeysEnum } from '@novu/shared';
import { motion } from 'motion/react';
import { useState } from 'react';
import { RiGroup2Line } from 'react-icons/ri';
import { Separator } from '@/components/primitives/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/primitives/tabs';
import { Preferences } from '@/components/subscribers/preferences/preferences';
import { PreferencesSkeleton } from '@/components/subscribers/preferences/preferences-skeleton';
import { SubscriberActivity } from '@/components/subscribers/subscriber-activity';
import { SubscriberOverviewForm } from '@/components/subscribers/subscriber-overview-form';
import { SubscriberOverviewSkeleton } from '@/components/subscribers/subscriber-overview-skeleton';
import { SubscriberSubscriptions } from '@/components/subscribers/subscriptions/subscriber-subscriptions';
import TruncatedText from '@/components/truncated-text';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useFetchSubscriber } from '@/hooks/use-fetch-subscriber';
import useFetchSubscriberPreferences from '@/hooks/use-fetch-subscriber-preferences';
import { useFormProtection } from '@/hooks/use-form-protection';

type SubscriberOverviewProps = {
  subscriberId: string;
  readOnly?: boolean;
  onCloseDrawer?: () => void;
  closeOnSave?: boolean;
};

const SubscriberOverview = (props: SubscriberOverviewProps) => {
  const { subscriberId, readOnly = false, onCloseDrawer, closeOnSave = false } = props;
  const { data, isPending } = useFetchSubscriber({
    subscriberId,
  });

  if (isPending) {
    return <SubscriberOverviewSkeleton />;
  }

  return (
    <SubscriberOverviewForm
      subscriber={data!}
      readOnly={readOnly}
      onCloseDrawer={onCloseDrawer}
      closeOnSave={closeOnSave}
    />
  );
};

type SubscriberPreferencesProps = {
  subscriberId: string;
  readOnly?: boolean;
};

const SubscriberPreferences = (props: SubscriberPreferencesProps) => {
  const { subscriberId, readOnly = false } = props;
  const { data, isPending } = useFetchSubscriberPreferences({
    subscriberId,
  });

  if (isPending) {
    return <PreferencesSkeleton />;
  }

  return <Preferences subscriberPreferences={data!} subscriberId={subscriberId} readOnly={readOnly} />;
};

const tabTriggerClasses =
  'hover:data-[state=inactive]:text-foreground-950 py-3 rounded-none [&>span]:h-5 px-0 relative';

type SubscriberTabsProps = {
  subscriberId: string;
  readOnly?: boolean;
  onCloseDrawer?: () => void;
  closeOnSave?: boolean;
};

export function SubscriberTabs(props: SubscriberTabsProps) {
  const { subscriberId, readOnly = false, onCloseDrawer, closeOnSave = false } = props;
  const [tab, setTab] = useState('overview');
  const {
    protectedOnValueChange,
    ProtectionAlert,
    ref: protectionRef,
  } = useFormProtection({
    onValueChange: setTab,
  });
  const isTopicsPageActive = useFeatureFlag(FeatureFlagsKeysEnum.IS_TOPICS_PAGE_ACTIVE, false);

  return (
    <Tabs
      ref={protectionRef}
      className="flex h-full w-full flex-col"
      value={tab}
      onValueChange={protectedOnValueChange}
    >
      <header className="border-bg-soft flex h-12 w-full flex-row items-center gap-3 border-b px-3 py-4">
        <div className="flex flex-1 items-center gap-1 overflow-hidden text-sm font-medium">
          <RiGroup2Line className="size-5 p-0.5" />
          <TruncatedText className="flex-1">Subscriber Profile - {subscriberId}</TruncatedText>
        </div>
      </header>

      <TabsList className="border-bg-soft h-auto w-full items-center gap-6 rounded-none border-b bg-transparent px-3 py-0">
        <TabsTrigger value="overview" className={tabTriggerClasses} variant="regular" size="lg">
          <span>Overview</span>
          {tab === 'overview' && <ActiveTabIndicator />}
        </TabsTrigger>
        <TabsTrigger value="preferences" className={tabTriggerClasses} variant="regular" size="lg">
          <span>Preferences</span>
          {tab === 'preferences' && <ActiveTabIndicator />}
        </TabsTrigger>
        {isTopicsPageActive && (
          <TabsTrigger value="subscriptions" className={tabTriggerClasses} variant="regular" size="lg">
            <span>Subscriptions</span>
            {tab === 'subscriptions' && <ActiveTabIndicator />}
          </TabsTrigger>
        )}
        <TabsTrigger value="activity-feed" className={tabTriggerClasses} variant="regular" size="lg">
          <span>Activity Feed</span>
          {tab === 'activity-feed' && <ActiveTabIndicator />}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="h-full w-full overflow-y-auto">
        <SubscriberOverview
          subscriberId={subscriberId}
          readOnly={readOnly}
          onCloseDrawer={onCloseDrawer}
          closeOnSave={closeOnSave}
        />
      </TabsContent>
      <TabsContent value="preferences" className="h-full w-full overflow-y-auto">
        <SubscriberPreferences subscriberId={subscriberId} readOnly={readOnly} />
      </TabsContent>
      {isTopicsPageActive && (
        <TabsContent value="subscriptions" className="h-full w-full overflow-y-auto">
          <SubscriberSubscriptions subscriberId={subscriberId} />
        </TabsContent>
      )}
      <TabsContent value="activity-feed" className="h-full w-full overflow-y-auto">
        <SubscriberActivity subscriberId={subscriberId} />
      </TabsContent>
      <Separator />

      {ProtectionAlert}
    </Tabs>
  );
}

const ActiveTabIndicator = () => {
  return <motion.div layoutId="active-tab" className="bg-primary-base absolute bottom-0 left-0 right-0 z-10 h-[2px]" />;
};
