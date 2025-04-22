import { Separator } from '@/components/primitives/separator';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/primitives/sheet';
import { Skeleton } from '@/components/primitives/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/primitives/tabs';
import { VisuallyHidden } from '@/components/primitives/visually-hidden';
import { ExternalLink } from '@/components/shared/external-link';
import TruncatedText from '@/components/truncated-text';
import { useFormProtection } from '@/hooks/use-form-protection';
import { itemVariants, listVariants } from '@/utils/animation';
import { motion } from 'motion/react';
import { forwardRef, useEffect, useState } from 'react';
import { RiMailSettingsLine, RiUser3Fill } from 'react-icons/ri';
import { cn } from '../../utils/ui';
import { useTopic } from './hooks/use-topic';
import { useTopicEvents } from './hooks/use-topic-events';
import { TopicActivity } from './topic-activity';
import { TopicOverviewForm, TopicOverviewSkeleton } from './topic-overview-form';

const tabTriggerClasses =
  'hover:data-[state=inactive]:text-foreground-950 h-11 py-3 rounded-none [&>span]:h-5 px-0 relative';

const ActiveTabIndicator = () => {
  return <motion.div layoutId="active-tab" className="bg-primary-base absolute bottom-0 left-0 right-0 z-10 h-[2px]" />;
};

type TopicOverviewProps = {
  topicKey: string;
  readOnly?: boolean;
};

const TopicOverview = (props: TopicOverviewProps) => {
  const { topicKey, readOnly = false } = props;
  const { data, isPending } = useTopic(topicKey);

  if (isPending) {
    return <TopicOverviewSkeleton />;
  }

  return <TopicOverviewForm topic={data!} readOnly={readOnly} />;
};

type TopicSubscribersProps = {
  topicKey: string;
  readOnly?: boolean;
};

const TopicSubscribersEmptyState = () => {
  return (
    <motion.div
      key="empty-state"
      className="flex h-full w-full items-center justify-center border-t border-t-neutral-200"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{
        duration: 0.15,
        ease: [0.4, 0, 0.2, 1],
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 5 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 5 }}
        transition={{
          duration: 0.25,
          delay: 0.1,
          ease: [0.4, 0, 0.2, 1],
        }}
        className="flex flex-col items-center gap-6"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: 0.2,
            delay: 0.2,
          }}
          className="relative"
        >
          <RiUser3Fill className="size-12 text-neutral-300" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.2,
            delay: 0.25,
          }}
          className="flex flex-col items-center gap-1 text-center"
        >
          <h2 className="text-foreground-900 text-lg font-medium">This topic doesn't have any subscribers yet</h2>
          <p className="text-foreground-600 max-w-md text-sm font-normal">
            Subscribers can be added to this topic via the API. Once added, they will receive notifications when this
            topic is triggered.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.2,
            delay: 0.3,
          }}
          className="flex items-center gap-6"
        >
          <ExternalLink
            variant="documentation"
            href="https://docs.novu.co/platform/concepts/topics#add-subscribers-to-a-topic"
            target="_blank"
            underline={false}
          >
            Learn More
          </ExternalLink>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

const TopicSubscribers = (props: TopicSubscribersProps) => {
  const { topicKey } = props;
  const { data, isPending } = useTopic(topicKey);

  if (isPending) {
    return (
      <motion.div
        key="loading-state"
        initial="hidden"
        animate="visible"
        variants={listVariants}
        className="flex flex-1 flex-col overflow-y-auto border-t border-t-neutral-200"
      >
        {Array.from({ length: 5 }).map((_, index) => (
          <motion.div key={index} variants={itemVariants} className="border-b-stroke-soft flex w-full border-b">
            <div className="flex w-full items-center px-3 py-2">
              <Skeleton className="h-4 w-40" />
            </div>
          </motion.div>
        ))}
      </motion.div>
    );
  }

  // Handle subscribers as an optional property with a fallback to empty array
  const subscribers = (data as any)?.subscribers || [];

  if (subscribers.length === 0) {
    return <TopicSubscribersEmptyState />;
  }

  return (
    <motion.div
      key="subscribers-list"
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: 0.03,
          },
        },
      }}
      className="flex flex-1 flex-col overflow-y-auto border-t border-t-neutral-200"
    >
      {subscribers.map((subscriberId: string, index: number) => (
        <motion.div
          key={`${subscriberId}-${index}`}
          variants={itemVariants}
          className="border-b-stroke-soft flex w-full border-b last:border-b-0"
        >
          <div className="flex w-full items-center px-3 py-2">
            <RiUser3Fill className="mr-2 size-3.5 min-w-3.5 text-neutral-500" />
            <span className="text-label-xs text-foreground-950">{subscriberId}</span>
          </div>
        </motion.div>
      ))}
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
          <RiMailSettingsLine className="size-5 p-0.5" />
          <TruncatedText className="flex-1">Topic - {topicKey}</TruncatedText>
        </div>
      </header>

      <TabsList className="border-bg-soft h-auto w-full items-center gap-6 rounded-none border-b bg-transparent px-3 py-0">
        <TabsTrigger value="overview" className={tabTriggerClasses}>
          <span>Overview</span>
          {tab === 'overview' && <ActiveTabIndicator />}
        </TabsTrigger>
        <TabsTrigger value="subscribers" className={tabTriggerClasses}>
          <span>Subscribers</span>
          {tab === 'subscribers' && <ActiveTabIndicator />}
        </TabsTrigger>
        <TabsTrigger value="activity-feed" className={tabTriggerClasses}>
          <span>Activity Feed</span>
          {tab === 'activity-feed' && <ActiveTabIndicator />}
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

type TopicDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topicKey: string;
  readOnly?: boolean;
};

export const TopicDrawer = forwardRef<HTMLDivElement, TopicDrawerProps>((props, forwardedRef) => {
  const { open, onOpenChange, topicKey, readOnly = false } = props;
  const { subscribeToEvent } = useTopicEvents();

  useEffect(() => {
    // Close the drawer if the current topic is deleted
    const unsubscribe = subscribeToEvent('deleted', (deletedTopicKey) => {
      if (deletedTopicKey === topicKey && open) {
        onOpenChange(false);
      }
    });

    return unsubscribe;
  }, [subscribeToEvent, topicKey, open, onOpenChange]);

  return (
    <>
      <Sheet open={open} modal={false} onOpenChange={onOpenChange}>
        {/* Custom overlay since SheetOverlay does not work with modal={false} */}
        <div
          className={cn('fade-in animate-in fixed inset-0 z-50 bg-black/20 transition-opacity duration-300', {
            'pointer-events-none opacity-0': !open,
          })}
        />
        <SheetContent ref={forwardedRef} className="w-[560px]">
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
