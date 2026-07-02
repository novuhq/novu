import { RiCloseFill } from 'react-icons/ri';
import { Separator } from '@/components/primitives/separator';
import { Skeleton } from '@/components/primitives/skeleton';
import { useFetchConversation, useFetchConversationActivities } from '@/hooks/use-fetch-conversation-activities';
import { ConversationOverview } from './conversation-overview';
import { ConversationTimeline } from './conversation-timeline';

type ConversationDetailProps = {
  conversationId: string;
  onClose?: () => void;
};

export function ConversationDetail({ conversationId, onClose }: ConversationDetailProps) {
  const { conversation, isLoading: isConversationLoading } = useFetchConversation(conversationId);
  const { activities, totalCount, isLoading: isActivitiesLoading } = useFetchConversationActivities(conversationId);

  return (
    <div className="flex h-full flex-col">
      <div className="z-10 mb-4 flex h-8 shrink-0 items-center justify-between rounded-t-lg bg-bg-weak px-3 shadow-[0_0_0_1px_hsl(var(--neutral-alpha-200))] ">
        <span className="text-text-strong text-label-sm font-medium">Conversation</span>
        <div className="flex items-center gap-0.5">
          {onClose && (
            <button
              type="button"
              aria-label="Close conversation"
              onClick={onClose}
              className="text-text-soft hover:text-text-strong rounded p-0.5"
            >
              <RiCloseFill className="size-4" />
            </button>
          )}
        </div>
      </div>

      <div className="shrink-0">
        {isConversationLoading ? (
          <OverviewSkeleton />
        ) : conversation ? (
          <div className="px-3 pb-2">
            <ConversationOverview conversation={conversation} />
          </div>
        ) : null}
        <Separator />
      </div>

      <div className="flex-1 overflow-y-auto">
        <ConversationTimeline
          activities={activities}
          isLoading={isActivitiesLoading}
          totalCount={totalCount}
          conversationStatus={conversation?.status}
        />
      </div>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="flex flex-col gap-2 px-3 py-2">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="border-stroke-soft flex flex-col gap-1 rounded-lg border p-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-1">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3.5 w-32" />
          </div>
        ))}
      </div>
      <div className="border-stroke-soft rounded-lg border p-2">
        <div className="flex items-center gap-2">
          <Skeleton className="size-8 rounded-full" />
          <div className="flex flex-1 flex-col gap-1">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3 w-36" />
          </div>
        </div>
      </div>
    </div>
  );
}
