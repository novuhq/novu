import { Separator } from '@/components/primitives/separator';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/primitives/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/primitives/tabs';
import { VisuallyHidden } from '@/components/primitives/visually-hidden';
import TruncatedText from '@/components/truncated-text';
import { useFormProtection } from '@/hooks/use-form-protection';
import { motion } from 'motion/react';
import { forwardRef, useState } from 'react';
import { RiMailSettingsLine } from 'react-icons/ri';
import { cn } from '../../utils/ui';
import { useTopic } from './hooks/use-topic';
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

const TopicSubscribers = (props: TopicSubscribersProps) => {
  return (
    <div className="p-4">
      <p>Topic subscribers will be displayed here</p>
    </div>
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
      </TabsList>
      <TabsContent value="overview" className="h-full w-full overflow-y-auto">
        <TopicOverview topicKey={topicKey} readOnly={readOnly} />
      </TabsContent>
      <TabsContent value="subscribers" className="h-full w-full overflow-y-auto">
        <TopicSubscribers topicKey={topicKey} readOnly={readOnly} />
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

  return (
    <>
      <Sheet open={open} modal={false} onOpenChange={onOpenChange}>
        {/* Custom overlay since SheetOverlay does not work with modal={false} */}
        <div
          className={cn('fade-in animate-in fixed inset-0 z-50 bg-black/20 transition-opacity duration-300', {
            'pointer-events-none opacity-0': !open,
          })}
        />
        <SheetContent ref={forwardedRef}>
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
