import type { AgentResponse } from '@/api/agents';
import { RecentConversationsSection } from '../agents/recent-conversations-section';
import { ConnectedProvidersSection } from './connected-providers-section';
import { McpsSection } from './mcps-section';
import { ToolsSection } from './tools-section';

type AgentManagedOverviewProps = {
  agent: AgentResponse;
};

export function AgentManagedOverview({ agent }: AgentManagedOverviewProps) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4 w-full">
      <ConnectedProvidersSection agent={agent} />
      <McpsSection agent={agent} />
      <ToolsSection agent={agent} />
      <RecentConversationsSection agent={agent} />
    </div>
  );
}
