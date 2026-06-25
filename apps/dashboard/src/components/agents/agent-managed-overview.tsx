import { FeatureFlagsKeysEnum } from '@novu/shared';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { type AgentResponse, getAgentIntegrationsQueryKey, listAgentIntegrations } from '@/api/agents';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { useAgentDemoQuota } from '@/hooks/use-agent-demo-quota';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { RecentConversationsSection } from '../agents/recent-conversations-section';
import { AgentSetupGuide } from './agent-setup-guide';
import { AgentWhatsNextSection } from './agent-whats-next-section';
import { ConnectedProvidersSection } from './connected-providers-section';
import { DemoClaudeUpgradePanel } from './demo-claude-upgrade-panel';
import { DemoQuotaBanner } from './demo-quota-banner';
import { isUserFacingConnectedAgentIntegration } from './is-agent-integration-connected';
import { McpsSection } from './mcps-section';
import { SystemPromptSection } from './system-prompt-section';
import { ToolsSection } from './tools-section';

type AgentManagedOverviewProps = {
  agent: AgentResponse;
};

export function AgentManagedOverview({ agent }: AgentManagedOverviewProps) {
  const { currentEnvironment } = useEnvironment();
  const isDemoManagedClaudeEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_DEMO_MANAGED_CLAUDE_ENABLED);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const demoQuotaQuery = useAgentDemoQuota(agent.identifier);

  const integrationsQuery = useQuery({
    queryKey: getAgentIntegrationsQueryKey(currentEnvironment?._id, agent.identifier),
    queryFn: () =>
      listAgentIntegrations({
        environment: requireEnvironment(currentEnvironment, 'No environment selected'),
        agentIdentifier: agent.identifier,
        limit: 100,
      }),
    enabled: Boolean(currentEnvironment && agent.identifier),
  });

  // The novu-email-agent integration is auto-provisioned for every managed agent,
  // so it must not count toward "has a channel connected" — otherwise the setup
  // guide would never surface for a freshly created managed agent.
  const hasConnectedChannel = useMemo(() => {
    const links = integrationsQuery.data?.data;

    if (!links?.length) {
      return false;
    }

    return links.some(isUserFacingConnectedAgentIntegration);
  }, [integrationsQuery.data?.data]);

  const showSetupGuide = integrationsQuery.isSuccess && !hasConnectedChannel;

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4 w-full">
      {isDemoManagedClaudeEnabled && demoQuotaQuery.data ? (
        <DemoQuotaBanner quota={demoQuotaQuery.data} onUpgrade={() => setUpgradeOpen(true)} />
      ) : null}
      <AgentWhatsNextSection agent={agent} />
      {showSetupGuide ? <AgentSetupGuide agent={agent} /> : <ConnectedProvidersSection agent={agent} />}
      <McpsSection agent={agent} />
      <SystemPromptSection agent={agent} />
      <ToolsSection agent={agent} />
      <RecentConversationsSection agent={agent} />
      {isDemoManagedClaudeEnabled ? (
        <DemoClaudeUpgradePanel agent={agent} open={upgradeOpen} onOpenChange={setUpgradeOpen} />
      ) : null}
    </div>
  );
}
