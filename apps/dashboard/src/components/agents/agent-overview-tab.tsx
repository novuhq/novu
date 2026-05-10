import { useState } from 'react';
import type { AgentResponse } from '@/api/agents';
import { AgentBehaviorSection } from '@/components/agents/agent-behavior-section';
import { AgentRuntimeAuthBanner } from '@/components/agents/agent-runtime-auth-banner';
import { AgentRuntimeBadge } from '@/components/agents/agent-runtime-badge';
import { AgentRuntimeConfigSection } from '@/components/agents/agent-runtime-config-section';
import { AgentRuntimeDriftModal } from '@/components/agents/agent-runtime-drift-modal';
import { AgentSetupGuide } from '@/components/agents/agent-setup-guide';
import { AgentSidebarWidget } from '@/components/agents/agent-sidebar-widget';
import { ConnectedProvidersSection } from '@/components/agents/connected-providers-section';
import { RecentConversationsSection } from '@/components/agents/recent-conversations-section';
import { useEnvironment } from '@/context/environment/hooks';

type AgentOverviewTabProps = {
  agent: AgentResponse;
};

export function AgentOverviewTab({ agent }: AgentOverviewTabProps) {
  const { readOnly } = useEnvironment();
  const isBridgeConnected = Boolean(agent.bridgeUrl || (agent.devBridgeActive && agent.devBridgeUrl));
  const isManagedRuntime = agent.runtime === 'managed';

  // Snapshot connection state on mount so that users who are actively
  // completing the quick-start stay on the setup guide (and see the
  // completion step) even after the bridge connects mid-session. Users who
  // arrive with a bridge already connected get the connected overview.
  const [wasBridgeConnectedOnMount] = useState(isBridgeConnected);
  const [showDriftModal, setShowDriftModal] = useState(false);
  const [showAuthBanner, setShowAuthBanner] = useState(false);

  const showConnectedOverview = readOnly || wasBridgeConnectedOnMount || isManagedRuntime;

  return (
    <>
      {showAuthBanner && <AgentRuntimeAuthBanner integrationId={agent.managedRuntime?.integrationId} />}

      <div className="flex items-start gap-6 px-6 pt-4">
        <AgentSidebarWidget agent={agent} />

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {/* Runtime badge */}
          <div className="flex items-center gap-2">
            <AgentRuntimeBadge runtime={agent.runtime} providerId={agent.managedRuntime?.providerId} />
          </div>

          {/* Managed runtime: show live config section + standard sections */}
          {isManagedRuntime && (
            <AgentRuntimeConfigSection
              agent={agent}
              onDrift={() => setShowDriftModal(true)}
              onUnauthorized={() => setShowAuthBanner(true)}
            />
          )}

          {/* Standard connected overview / setup guide sections */}
          {showConnectedOverview ? (
            <>
              <AgentBehaviorSection agent={agent} />
              <ConnectedProvidersSection agent={agent} />
              <RecentConversationsSection agent={agent} />
            </>
          ) : (
            <AgentSetupGuide agent={agent} />
          )}
        </div>
      </div>

      <AgentRuntimeDriftModal
        open={showDriftModal}
        onOpenChange={setShowDriftModal}
        onRecreate={() => {
          // Recreating the agent is a future action (re-provision + update externalAgentId).
          // For now, close the modal and let the user take action via the edit flow.
          setShowDriftModal(false);
        }}
        onUnlink={() => {
          // Unlinking is also deferred to a dedicated PATCH /agents/:id action.
          setShowDriftModal(false);
        }}
      />
    </>
  );
}
