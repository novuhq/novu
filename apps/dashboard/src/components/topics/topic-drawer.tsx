import { FeatureFlagsKeysEnum } from '@novu/shared';
import { motion } from 'motion/react';
import { forwardRef, useEffect, useRef, useState } from 'react';
import { RiDiscussLine } from 'react-icons/ri';
import { ListTopicSubscriptionsResponse, TopicSubscription } from '@/api/topics';
import { Separator } from '@/components/primitives/separator';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/primitives/sheet';
import { Skeleton } from '@/components/primitives/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/primitives/tabs';
import { TooltipProvider } from '@/components/primitives/tooltip';
import { VisuallyHidden } from '@/components/primitives/visually-hidden';
import TruncatedText from '@/components/truncated-text';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useFormProtection } from '@/hooks/use-form-protection';
import { itemVariants, listVariants } from '@/utils/animation';
import { cn } from '../../utils/ui';
import { AddSubscriberForm } from './add-subscriber-form';
import { EmptyTopicsIllustration } from './empty-topics-illustration';
import { useTopic } from './hooks/use-topic';
import { useTopicSubscriptions } from './hooks/use-topic-subscribers';
import { SubscriptionCountBadge } from './subscription-count-badge';
import { TopicActivity } from './topic-activity';
import { TopicOverviewForm, TopicOverviewSkeleton } from './topic-overview-form';
import { TopicSubscriberFilter } from './topic-subscriber-filter';
import { TopicSubscriberItem } from './topic-subscriber-item';

const tabTriggerClasses =
  'hover:data-[state=inactive]:text-foreground-950 h-11 py-3 rounded-none [&>span]:h-5 px-0 relative';

type TopicOverviewProps = {
  topicKey: string;
  readOnly?: boolean;
};

const TopicNotFound = () => {
  return (
    <div className="mt-[100px] flex h-full w-full flex-col items-center justify-center gap-6">
      <EmptyTopicsIllustration />
      <div className="flex flex-col items-center gap-2 text-center">
        <h3 className="text-lg font-semibold">Topic Not Found</h3>
        <p className="text-text-soft text-paragraph-sm max-w-[60ch]">
          The topic you are looking for does not exist or has been deleted.
        </p>
      </div>
    </div>
  );
};

const TopicOverview = (props: TopicOverviewProps) => {
  const { topicKey, readOnly = false } = props;
  const { data, isPending, error } = useTopic(topicKey);

  if (isPending) {
    return <TopicOverviewSkeleton />;
  }

  if (error) {
    return <TopicNotFound />;
  }

  if (!data) {
    return <TopicOverviewSkeleton />;
  }

  return <TopicOverviewForm topic={data} readOnly={readOnly} />;
};

type TopicSubscribersProps = {
  topicKey: string;
  readOnly?: boolean;
  subscriptionData: ListTopicSubscriptionsResponse | undefined;
  isLoading: boolean;
  error: Error | null;
  subscriberId?: string;
  onSubscriberIdChange: (subscriberId?: string) => void;
  onLoadingChange: (loading: boolean) => void;
  contextKeys: string[];
  onContextKeysChange: (contextKeys: string[]) => void;
};

const TopicSubscribers = (props: TopicSubscribersProps) => {
  const {
    topicKey,
    readOnly = false,
    subscriptionData,
    isLoading,
    error,
    subscriberId,
    onSubscriberIdChange,
    onLoadingChange,
    contextKeys,
    onContextKeysChange,
  } = props;

  if (error) {
    return <TopicNotFound />;
  }

  const subscriptions = subscriptionData?.data || [];

  return (
    <motion.div
      key="subscribers-list-container"
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: 0.03,
          },
        },
      }}
      className="flex flex-1 flex-col overflow-y-auto"
    >
      <div
        className={cn('border-b border-b-neutral-200 px-3 py-4', {
          'flex flex-col gap-4': !readOnly,
        })}
      >
        {!readOnly && <AddSubscriberForm topicKey={topicKey} contextKeys={contextKeys} />}
      </div>
      <div
        className={cn('border-b border-b-neutral-200 px-3 py-2', {
          'flex flex-col gap-4': !readOnly,
        })}
      >
        <TopicSubscriberFilter
          topicKey={topicKey}
          subscriberId={subscriberId}
          onSubscriberIdChange={onSubscriberIdChange}
          isLoading={isLoading}
          onLoadingChange={onLoadingChange}
          contextKeys={contextKeys}
          onContextKeysChange={onContextKeysChange}
        />
      </div>

      {isLoading ? (
        <motion.div
          key="loading-state"
          initial="hidden"
          animate="visible"
          variants={listVariants}
          className="flex flex-1 flex-col"
        >
          {Array.from({ length: 5 }).map((_, index) => (
            <motion.div key={index} variants={itemVariants} className="border-b-stroke-soft flex w-full border-b">
              <div className="flex w-full items-center px-3 py-2">
                <Skeleton className="mr-3 size-8 rounded-full" />
                <div className="flex flex-col gap-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="ml-auto h-4 w-20" />
              </div>
            </motion.div>
          ))}
        </motion.div>
      ) : subscriptions.length === 0 ? (
        <TopicListBlank />
      ) : (
        <motion.div
          key="subscribers-list-items"
          className="flex flex-1 flex-col overflow-y-auto"
          initial="hidden"
          animate="visible"
          variants={listVariants}
        >
          {subscriptions.map((subscription: TopicSubscription) => (
            <TopicSubscriberItem
              key={subscription._id}
              subscription={subscription}
              topicKey={topicKey}
              readOnly={readOnly}
            />
          ))}
        </motion.div>
      )}
    </motion.div>
  );
};

type TopicTabsProps = {
  topicKey: string;
  readOnly?: boolean;
};

function TopicTabs(props: TopicTabsProps) {
  const { topicKey, readOnly = false } = props;
  const isContextPreferencesEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_CONTEXT_PREFERENCES_ENABLED);
  const [tab, setTab] = useState('overview');
  const [subscriberId, setSubscriberId] = useState<string | undefined>(undefined);
  const [contextKeys, setContextKeys] = useState<string[]>(['']);
  const [isFilterLoading, setIsFilterLoading] = useState(false);

  // Fetch subscription data at the top level so count is always available
  const {
    data: subscriptionData,
    isPending,
    error,
  } = useTopicSubscriptions(topicKey, {
    subscriberId,
    contextKeys: isContextPreferencesEnabled ? contextKeys : undefined,
  });

  const {
    protectedOnValueChange,
    ProtectionAlert,
    ref: protectionRef,
  } = useFormProtection({
    onValueChange: setTab,
  });

  const isLoading = isPending || isFilterLoading;

  useEffect(() => {
    if (!isPending && isFilterLoading) {
      setIsFilterLoading(false);
    }
  }, [isPending, isFilterLoading]);

  const handleSubscriberIdChange = (newSubscriberId?: string) => {
    setSubscriberId(newSubscriberId);
  };

  // Extract count data for the badge - only use unfiltered data for count
  const subscriptionCount =
    subscriptionData && !subscriberId
      ? {
          totalCount: subscriptionData.totalCount,
          totalCountCapped: subscriptionData.totalCountCapped,
        }
      : null;

  return (
    <TooltipProvider>
      <Tabs
        ref={protectionRef}
        className="flex h-full w-full flex-col"
        value={tab}
        onValueChange={protectedOnValueChange}
      >
        <header className="border-bg-soft flex h-12 w-full flex-row items-center gap-3 border-b px-3 py-4">
          <div className="flex flex-1 items-center gap-1 overflow-hidden text-sm font-medium">
            <RiDiscussLine className="size-5 p-0.5" />
            <TruncatedText className="flex-1 pr-10">Topic - {topicKey}</TruncatedText>
          </div>
        </header>

        <TabsList
          variant={'regular'}
          className="border-bg-soft h-auto w-full items-center gap-6 rounded-none border-b border-t-0 bg-transparent px-3 py-0"
        >
          <TabsTrigger value="overview" className={tabTriggerClasses}>
            Overview
          </TabsTrigger>
          <TabsTrigger value="subscribers" className={cn(tabTriggerClasses, 'flex items-center')}>
            Subscriptions
            {subscriptionCount && (
              <SubscriptionCountBadge
                count={subscriptionCount.totalCount}
                isCapped={subscriptionCount.totalCountCapped}
              />
            )}
          </TabsTrigger>
          <TabsTrigger value="activity-feed" className={tabTriggerClasses}>
            Activity Feed
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="h-full w-full overflow-y-auto">
          <TopicOverview topicKey={topicKey} readOnly={readOnly} />
        </TabsContent>
        <TabsContent value="subscribers" className="h-full w-full overflow-y-auto">
          <TopicSubscribers
            topicKey={topicKey}
            readOnly={readOnly}
            subscriptionData={subscriptionData}
            isLoading={isLoading}
            error={error}
            subscriberId={subscriberId}
            onSubscriberIdChange={handleSubscriberIdChange}
            onLoadingChange={setIsFilterLoading}
            contextKeys={contextKeys}
            onContextKeysChange={setContextKeys}
          />
        </TabsContent>
        <TabsContent value="activity-feed" className="h-full w-full overflow-y-auto">
          <TopicActivity topicKey={topicKey} />
        </TabsContent>
        <Separator />

        {ProtectionAlert}
      </Tabs>
    </TooltipProvider>
  );
}

const TopicListBlank = () => {
  return (
    <div className="mt-[100px] flex h-full w-full flex-col items-center justify-center gap-6">
      <EmptyTopicsIllustration />
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-text-soft text-paragraph-sm max-w-[60ch]">
          No subscribers added yet, Add subscribers via the API or manually to start sending notifications.
        </p>
      </div>
    </div>
  );
};

type TopicDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topicKey: string;
  readOnly?: boolean;
  className?: string;
};

export const TopicDrawer = forwardRef<HTMLDivElement, TopicDrawerProps>((props, forwardedRef) => {
  const { open, onOpenChange, topicKey, readOnly = false, className } = props;
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleInteractOutside = (e: Event) => {
    const target = e.target as Node;
    if (overlayRef.current?.contains(target)) {
      onOpenChange(false);
    } else {
      e.preventDefault();
    }
  };

  return (
    <Sheet open={open} modal={false} onOpenChange={onOpenChange}>
      {/* Custom overlay since SheetOverlay does not work with modal={false} */}
      <div
        ref={overlayRef}
        className={cn('fade-in animate-in fixed inset-0 z-50 bg-black/20 transition-opacity duration-300', {
          'pointer-events-none opacity-0': !open,
        })}
      />
      <SheetContent ref={forwardedRef} className={cn('w-[580px]', className)} onInteractOutside={handleInteractOutside}>
        <VisuallyHidden>
          <SheetTitle />
          <SheetDescription />
        </VisuallyHidden>
        <TopicTabs topicKey={topicKey} readOnly={readOnly} />
      </SheetContent>
    </Sheet>
  );
});

type TopicDrawerButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  topicKey: string;
  readOnly?: boolean;
};

export const TopicDrawerButton = (props: TopicDrawerButtonProps) => {
  const { topicKey, onClick, readOnly = false, ...rest } = props;
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        {...rest}
        onClick={(e) => {
          setOpen(true);
          onClick?.(e);
        }}
      />
      <TopicDrawer open={open} onOpenChange={setOpen} topicKey={topicKey} readOnly={readOnly} />
    </>
  );
};
