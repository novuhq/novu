import { Preferences } from '@/components/subscribers/preferences/preferences';
import { RiCloseLine, RiGroup2Line } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import { CompactButton } from '../primitives/button-compact';
import { Separator } from '../primitives/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../primitives/tabs';
import TruncatedText from '../truncated-text';
import { SubscriberOverviewForm } from './subscriber-overview-form';

const tabTriggerClasses =
  'hover:data-[state=inactive]:text-foreground-950 h-11 data-[state=active]:border-b data-[state=active]:border-primary-base data-[state=active]:border-b-2 py-3 rounded-none [&>span]:h-5 px-0';

export function SubscriberTabs({ subscriberId }: { subscriberId: string }) {
  const navigate = useNavigate();

  return (
    <Tabs defaultValue="overview" className="flex h-full w-full flex-col">
      <header className="border-bg-soft flex h-12 w-full flex-row items-center gap-3 border-b p-3">
        <div className="flex flex-1 items-center gap-1 overflow-hidden text-sm font-medium">
          <RiGroup2Line className="size-5 p-0.5" />
          <TruncatedText className="flex-1">Subscriber Profile - {subscriberId}</TruncatedText>
        </div>
        <CompactButton
          icon={RiCloseLine}
          variant="ghost"
          className="ml-auto size-6"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            navigate('../', { relative: 'path' });
          }}
        >
          <span className="sr-only">Close</span>
        </CompactButton>
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
        <SubscriberOverviewForm subscriberId={subscriberId} />
      </TabsContent>
      <TabsContent value="preferences" className="h-full w-full overflow-y-auto">
        <Preferences subscriberId={subscriberId} />
      </TabsContent>
      <TabsContent value="activity-feed" className="h-full w-full overflow-y-auto">
        <h2>Activity Feed</h2>
      </TabsContent>
      <Separator />
    </Tabs>
  );
}
