import { motion } from 'motion/react';
import { forwardRef, useEffect, useState } from 'react';
import { RiDiscussLine } from 'react-icons/ri';
import { TopicSubscription } from '@/api/topics';
import { Separator } from '@/components/primitives/separator';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/primitives/sheet';
import { Skeleton } from '@/components/primitives/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/primitives/tabs';
import { VisuallyHidden } from '@/components/primitives/visually-hidden';
import TruncatedText from '@/components/truncated-text';
import { useFormProtection } from '@/hooks/use-form-protection';
import { itemVariants, listVariants } from '@/utils/animation';
import { cn } from '../../utils/ui';
import { AddSubscriberForm } from './add-subscriber-form';
import { EmptyTopicsIllustration } from './empty-topics-illustration';
import { useTopic } from './hooks/use-topic';
import { useTopicSubscriptions } from './hooks/use-topic-subscribers';
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

  return <TopicOverviewForm topic={data!} readOnly={readOnly} />;
};

type TopicSubscribersProps = {
  topicKey: string;
  readOnly?: boolean;
};

const TopicSubscribers = (props: TopicSubscribersProps) => {
  const { topicKey, readOnly = false } = props;
  const [subscriberId, setSubscriberId] = useState<string | undefined>(undefined);
  const [isFilterLoading, setIsFilterLoading] = useState(false);
  const { data, isPending, error } = useTopicSubscriptions(topicKey, { subscriberId });

  const isLoading = isPending || isFilterLoading;

  useEffect(() => {
    if (!isPending && isFilterLoading) {
      setIsFilterLoading(false);
    }
  }, [isPending, isFilterLoading]);

  const handleSubscriberIdChange = (newSubscriberId?: string) => {
    setSubscriberId(newSubscriberId);
  };

  if (error) {
    return <TopicNotFound />;
  }

  const subscriptions = data?.data || [];

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
        {!readOnly && <AddSubscriberForm topicKey={topicKey} />}
      </div>
      <div
        className={cn('border-b border-b-neutral-200 px-3 py-2', {
          'flex flex-col gap-4': !readOnly,
        })}
      >
        <TopicSubscriberFilter
          topicKey={topicKey}
          subscriberId={subscriberId}
          onSubscriberIdChange={handleSubscriberIdChange}
          isLoading={isLoading}
          onLoadingChange={setIsFilterLoading}
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
        <TabsTrigger value="subscribers" className={tabTriggerClasses}>
          Subscriptions
        </TabsTrigger>
        <TabsTrigger value="activity-feed" className={tabTriggerClasses}>
          Activity Feed
        </TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="h-full w-full overflow-y-auto">
        <TopicOverview topicKey={topicKey} readOnly={readOnly} />
      </TabsContent>
      <TabsContent value="subscribers" className="h-full w-full overflow-y-auto">
        <TopicSubscribers topicKey={topicKey} readOnly={readOnly} />
      </TabsContent>
      <TabsContent value="activity-feed" className="h-full w-full overflow-y-auto">
        <TopicActivity topicKey={topicKey} />
      </TabsContent>
      <Separator />

      {ProtectionAlert}
    </Tabs>
  );
}

export const TopicListBlank = () => {
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
};

export const TopicDrawer = forwardRef<HTMLDivElement, TopicDrawerProps>((props, forwardedRef) => {
  const { open, onOpenChange, topicKey, readOnly = false } = props;

  return (
    <>
      <Sheet open={open} modal={false} onOpenChange={onOpenChange}>
        {/* Custom overlay since SheetOverlay does not work with modal={false} */}
        <div
          className={cn('fade-in animate-in fixed inset-0 z-50 bg-black/20 transition-opacity duration-300', {
            'pointer-events-none opacity-0': !open,
          })}
        />
        <SheetContent ref={forwardedRef} className="w-[580px]">
          <VisuallyHidden>
            <SheetTitle />
            <SheetDescription />
          </VisuallyHidden>
          <TopicTabs topicKey={topicKey} readOnly={readOnly} />
        </SheetContent>
      </Sheet>
    </>
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
