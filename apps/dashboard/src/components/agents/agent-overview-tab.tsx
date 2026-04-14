import type { AgentResponse } from '@/api/agents';
import { AgentSidebarWidget } from '@/components/agents/agent-sidebar-widget';

type AgentOverviewTabProps = {
  agent: AgentResponse;
};

function QuickStartGuidePlaceholder() {
  return (
    <div className="border-stroke-soft flex min-h-[400px] flex-1 items-center justify-center rounded-lg border border-dashed">
      <p className="text-text-soft text-label-sm">Quick start guide coming soon</p>
    </div>
  );
}

export function AgentOverviewTab({ agent }: AgentOverviewTabProps) {
  return (
    <div className="flex gap-6 px-6 pt-4">
      <AgentSidebarWidget agent={agent} />
      <QuickStartGuidePlaceholder />
    </div>
  );
}
