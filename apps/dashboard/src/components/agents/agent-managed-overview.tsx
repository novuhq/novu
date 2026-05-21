import { EmailProviderIdEnum } from '@novu/shared';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { type AgentResponse, getAgentIntegrationsQueryKey, listAgentIntegrations } from '@/api/agents';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { RecentConversationsSection } from '../agents/recent-conversations-section';
import { AgentSetupGuide } from './agent-setup-guide';
import { ConnectedProvidersSection } from './connected-providers-section';
import { McpsSection } from './mcps-section';
import { ToolsSection } from './tools-section';

type AgentManagedOverviewProps = {
  agent: AgentResponse;
};

export function AgentManagedOverview({ agent }: AgentManagedOverviewProps) {
  const { currentEnvironment } = useEnvironment();

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
    if (!links?.length) return false;

    return links.some(
      (link) => Boolean(link.connectedAt) && link.integration.providerId !== EmailProviderIdEnum.NovuAgent
    );
  }, [integrationsQuery.data?.data]);

  const showSetupGuide = integrationsQuery.isSuccess && !hasConnectedChannel;

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4 w-full">
      {showSetupGuide ? <AgentSetupGuide agent={agent} /> : <ConnectedProvidersSection agent={agent} />}
      <McpsSection agent={agent} />
      <ToolsSection agent={agent} />
      <RecentConversationsSection agent={agent} />
    </div>
  );
}
