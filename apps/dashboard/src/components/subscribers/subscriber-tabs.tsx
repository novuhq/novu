import { Separator } from '@/components/primitives/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/primitives/tabs';
import { Preferences } from '@/components/subscribers/preferences/preferences';
import { PreferencesSkeleton } from '@/components/subscribers/preferences/preferences-skeleton';
import { SubscriberActivity } from '@/components/subscribers/subscriber-activity';
import { SubscriberOverviewForm } from '@/components/subscribers/subscriber-overview-form';
import { SubscriberOverviewSkeleton } from '@/components/subscribers/subscriber-overview-skeleton';
import TruncatedText from '@/components/truncated-text';
import { useFetchSubscriber } from '@/hooks/use-fetch-subscriber';
import useFetchSubscriberPreferences from '@/hooks/use-fetch-subscriber-preferences';
import { useFormProtection } from '@/hooks/use-form-protection';
import { useState } from 'react';
import { RiGroup2Line } from 'react-icons/ri';

type SubscriberOverviewProps = {
  subscriberId: string;
  readOnly?: boolean;
};

const SubscriberOverview = (props: SubscriberOverviewProps) => {
  const { subscriberId, readOnly = false } = props;
  const { data, isPending } = useFetchSubscriber({
    subscriberId,
  });

  if (isPending) {
    return <SubscriberOverviewSkeleton />;
  }

  return <SubscriberOverviewForm subscriber={data!} readOnly={readOnly} />;
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
  'hover:data-[state=inactive]:text-foreground-950 h-11 data-[state=active]:border-b data-[state=active]:border-primary-base data-[state=active]:border-b-2 py-3 rounded-none [&>span]:h-5 px-0';

type SubscriberTabsProps = {
  subscriberId: string;
  readOnly?: boolean;
};

export function SubscriberTabs(props: SubscriberTabsProps) {
  const { subscriberId, readOnly = false } = props;
  const [tab, setTab] = useState('overview');
  const {
    protectedOnValueChange,
    ProtectionAlert,
    ref: protectionRef,
  } = useFormProtection({
    onValueChange: setTab,
  });

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
        <TabsTrigger value="overview" className={tabTriggerClasses}>
          <span>Overview</span>
        </TabsTrigger>
        <TabsTrigger value="preferences" className={tabTriggerClasses}>
          <span>Preferences</span>
        </TabsTrigger>
        <TabsTrigger value="activity-feed" className={tabTriggerClasses}>
          <span>Activity Feed</span>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="h-full w-full overflow-y-auto">
        <SubscriberOverview subscriberId={subscriberId} readOnly={readOnly} />
      </TabsContent>
      <TabsContent value="preferences" className="h-full w-full overflow-y-auto">
        <SubscriberPreferences subscriberId={subscriberId} readOnly={readOnly} />
      </TabsContent>
      <TabsContent value="activity-feed" className="h-full w-full overflow-y-auto">
        <SubscriberActivity subscriberId={subscriberId} />
      </TabsContent>
      <Separator />

      <ProtectionAlert />
    </Tabs>
  );
}
