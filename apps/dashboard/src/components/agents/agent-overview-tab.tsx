import { useState } from 'react';
import type { AgentResponse } from '@/api/agents';
import { AgentConnectedOverview } from '@/components/agents/agent-connected-overview';
import { AgentSetupGuide } from '@/components/agents/agent-setup-guide';
import { AgentSidebarWidget } from '@/components/agents/agent-sidebar-widget';
import { useEnvironment } from '@/context/environment/hooks';

type AgentOverviewTabProps = {
  agent: AgentResponse;
};

export function AgentOverviewTab({ agent }: AgentOverviewTabProps) {
  const { readOnly } = useEnvironment();
  const isBridgeConnected = Boolean(agent.bridgeUrl || (agent.devBridgeActive && agent.devBridgeUrl));

  // Snapshot connection state on mount so that users who are actively
  // completing the quick-start stay on the setup guide (and see the
  // completion step) even after the bridge connects mid-session. Users who
  // arrive with a bridge already connected get the connected overview.
  const [wasBridgeConnectedOnMount] = useState(isBridgeConnected);

  const showConnectedOverview = readOnly || wasBridgeConnectedOnMount;

  return (
    <div className="flex items-start gap-6 px-6 pt-4">
      <AgentSidebarWidget agent={agent} />
      {showConnectedOverview ? <AgentConnectedOverview agent={agent} /> : <AgentSetupGuide agent={agent} />}
    </div>
  );
}
