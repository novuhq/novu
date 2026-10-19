import { useState } from 'react';
import type { AgentResponse } from '@/api/agents';
import { AgentConnectedOverview } from '@/components/agents/agent-connected-overview';
import { AgentManagedOverview } from '@/components/agents/agent-managed-overview';
import { AgentSetupGuide } from '@/components/agents/agent-setup-guide';
import { AgentSidebarWidget } from '@/components/agents/agent-sidebar-widget';
import { useEnvironment } from '@/context/environment/hooks';

type AgentOverviewTabProps = {
  agent: AgentResponse;
};

export function AgentOverviewTab({ agent }: AgentOverviewTabProps) {
  const { readOnly } = useEnvironment();
  const isManaged = agent.runtime === 'managed';
  // Managed agents are "connected" as soon as the provider has provisioned them; self-hosted
  // agents still require a bridge URL before we swap the quick-start for the connected overview.
  const isConnected = isManaged
    ? Boolean(agent.managedRuntime?.externalAgentId)
    : Boolean(agent.bridgeUrl || (agent.devBridgeActive && agent.devBridgeUrl));

  // Snapshot connection state on mount so users actively completing the quick-start stay on
  // the setup guide (and see the completion step) even if the connection state flips mid-session.
  const [wasConnectedOnMount] = useState(isConnected);

  const showConnectedOverview = readOnly || wasConnectedOnMount;

  const renderBody = () => {
    if (!showConnectedOverview) {
      return <AgentSetupGuide agent={agent} />;
    }

    if (isManaged) {
      return <AgentManagedOverview agent={agent} />;
    }

    return <AgentConnectedOverview agent={agent} />;
  };

  return (
    <div className="flex flex-col items-start gap-4 px-4 pt-4 pb-6 md:flex-row md:gap-6 md:px-6 md:pb-0 md:pr-0 pr-0">
      <AgentSidebarWidget agent={agent} />
      {renderBody()}
    </div>
  );
}
