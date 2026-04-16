import { RiArrowRightLine, RiRobot2Line } from 'react-icons/ri';
import { Link, useLocation } from 'react-router-dom';
import type { AgentResponse } from '@/api/agents';
import { useEnvironment } from '@/context/environment/hooks';
import { buildRoute, ROUTES } from '@/utils/routes';

type RecentConversationsSectionProps = {
  agent: AgentResponse;
};

function SkeletonBar({ className }: { className?: string }) {
  return (
    <div
      className={className}
      style={{
        background: 'linear-gradient(90deg, #f1efef 24%, #f9f8f8 43%, rgba(249,248,248,0.75) 115%)',
      }}
    />
  );
}

function SkeletonMessageCard({ className }: { className?: string }) {
  return (
    <div className={`border-stroke-soft rounded border bg-white p-2 ${className ?? ''}`}>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1">
          <div className="bg-bg-weak size-3 rounded-full" />
          <SkeletonBar className="h-2 w-11 rounded-sm" />
        </div>
        <div className="flex flex-wrap gap-x-0.5 gap-y-[3px]">
          <SkeletonBar className="h-1.5 w-[77px] rounded-full" />
          <SkeletonBar className="h-1.5 min-w-0 flex-1 rounded-full" />
          <SkeletonBar className="h-1.5 min-w-[50px] flex-1 rounded-full" />
          <SkeletonBar className="h-1.5 w-[91px] rounded-full" />
        </div>
      </div>
    </div>
  );
}

function NovuIcon() {
  return (
    <svg className="size-3" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8Zm3.53 11.53L8 8.06l-3.53 3.47L3.06 10.12 6.53 6.65 3.06 3.18l1.41-1.41L8 5.24l3.53-3.47 1.41 1.41L9.47 6.65l3.47 3.47-1.41 1.41Z"
        fill="currentColor"
        className="text-text-soft"
      />
    </svg>
  );
}

function EmptyStateIllustration() {
  return (
    <div className="flex flex-col items-center gap-12">
      <div className="flex flex-col items-center">
        <div className="border-stroke-weak rounded-lg border p-1">
          <SkeletonMessageCard className="w-[197px]" />
        </div>
      </div>

      <div className="flex items-center gap-[50px]">
        <div className="border-stroke-weak w-[136px] rounded-lg border border-dashed p-0.5">
          <div className="border-stroke-soft bg-bg-white flex h-[47px] items-center justify-center gap-6 rounded-md border p-3">
            <RiRobot2Line className="text-text-soft size-4" />
            <NovuIcon />
          </div>
        </div>

        <div className="border-stroke-weak rounded-lg border p-1">
          <SkeletonMessageCard className="w-[197px]" />
        </div>
      </div>
    </div>
  );
}

export function RecentConversationsSection({ agent }: RecentConversationsSectionProps) {
  const { currentEnvironment } = useEnvironment();
  const location = useLocation();

  const activityTabPath = `${buildRoute(ROUTES.AGENT_DETAILS_TAB, {
    environmentSlug: currentEnvironment?.slug ?? '',
    agentIdentifier: encodeURIComponent(agent.identifier),
    agentTab: 'activity',
  })}${location.search}`;

  return (
    <div className="bg-bg-weak flex flex-col rounded-[10px] p-1">
      <div className="flex items-center justify-between px-2 py-1.5">
        <span className="text-text-soft font-code text-[11px] font-medium uppercase leading-4 tracking-wider">
          Recent conversations
        </span>
        <Link
          to={activityTabPath}
          className="text-text-sub hover:text-text-strong flex items-center gap-0.5 rounded-lg p-1.5 text-label-xs font-medium transition-colors"
        >
          View all activity
          <RiArrowRightLine className="size-4" />
        </Link>
      </div>

      <div className="bg-bg-white flex h-[300px] flex-col items-center justify-center overflow-hidden rounded-md shadow-[0px_0px_0px_1px_rgba(25,28,33,0.04),0px_1px_2px_0px_rgba(25,28,33,0.06),0px_0px_2px_0px_rgba(0,0,0,0.08)]">
        <div className="flex flex-1 flex-col items-center justify-center gap-6 p-4">
          <EmptyStateIllustration />
          <p className="text-text-soft text-label-xs max-w-[400px] text-center font-medium leading-4">
            No conversations, agent conversations will appear here once the agent starts responding to messages.
          </p>
        </div>
      </div>
    </div>
  );
}
