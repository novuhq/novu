import type { AgentResponse } from '@/api/agents';
import { AgentSetupGuide } from '@/components/agents/agent-setup-guide';
import { AgentSidebarWidget } from '@/components/agents/agent-sidebar-widget';

type AgentOverviewTabProps = {
  agent: AgentResponse;
};

export function AgentOverviewTab({ agent }: AgentOverviewTabProps) {
  return (
    <div className="flex gap-6 px-6 pt-4">
      <AgentSidebarWidget agent={agent} />
      <AgentSetupGuide agent={agent} />
    </div>
  );
}
