import type { AgentResponse } from '@/api/agents';
import { AgentBehaviorSection } from './agent-behavior-section';
import { ConnectedProvidersSection } from './connected-providers-section';
import { RecentConversationsSection } from './recent-conversations-section';

type AgentConnectedOverviewProps = {
  agent: AgentResponse;
};

export function AgentConnectedOverview({ agent }: AgentConnectedOverviewProps) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4">
      <AgentBehaviorSection agent={agent} />
      <ConnectedProvidersSection agent={agent} />
      <RecentConversationsSection agent={agent} />
    </div>
  );
}
