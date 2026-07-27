import { ChannelTypeEnum, providers as novuProviders, WorkflowResponseDto } from '@novu/shared';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { RiErrorWarningFill } from 'react-icons/ri';
import { type AgentIntegrationLink, getAgentIntegrationsQueryKey, listAgentIntegrations } from '@/api/agents';
import { isAgentIntegrationConnected } from '@/components/agents/is-agent-integration-connected';
import { ProviderIcon } from '@/components/integrations/components/provider-icon';
import { Skeleton } from '@/components/primitives/skeleton';
import {
  getWorkflowChannelOrder,
  WORKFLOW_AGENT_CHANNEL_LABEL,
} from '@/components/workflow-editor/workflow-agent-channels';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { getAgentChannelDisplayName } from '@/utils/agent-email-provider-display';

type WorkflowAgentConnectedChannelsProps = {
  workflow: WorkflowResponseDto;
  agentIdentifier: string | null | undefined;
};

function getIntegrationSecondaryLabel(link: AgentIntegrationLink): string {
  const integration = link.integration;

  if (integration.channel === ChannelTypeEnum.EMAIL && integration.sharedInboundAddress) {
    return integration.sharedInboundAddress;
  }

  return integration.identifier;
}

export function WorkflowAgentConnectedChannels({ workflow, agentIdentifier }: WorkflowAgentConnectedChannelsProps) {
  const { currentEnvironment } = useEnvironment();
  const channelOrder = useMemo(() => getWorkflowChannelOrder(workflow.steps), [workflow.steps]);

  const integrationsQuery = useQuery({
    queryKey: getAgentIntegrationsQueryKey(currentEnvironment?._id, agentIdentifier ?? undefined),
    queryFn: () =>
      listAgentIntegrations({
        environment: requireEnvironment(currentEnvironment, 'No environment selected'),
        agentIdentifier: agentIdentifier ?? '',
        limit: 100,
      }),
    enabled: Boolean(currentEnvironment && agentIdentifier),
  });

  const grouped = useMemo(() => {
    const links = integrationsQuery.data?.data ?? [];
    const matching = links.filter((link) => channelOrder.includes(link.integration.channel));
    const groups: { channel: ChannelTypeEnum; items: AgentIntegrationLink[] }[] = [];

    for (const channel of channelOrder) {
      const items = matching.filter((link) => link.integration.channel === channel);

      if (items.length > 0) {
        groups.push({ channel, items });
      }
    }

    return groups;
  }, [channelOrder, integrationsQuery.data?.data]);

  if (!agentIdentifier) {
    return (
      <p className="text-text-soft px-3 py-4 text-label-xs leading-4">
        Select an agent to preview the connected channels that match this workflow&apos;s steps.
      </p>
    );
  }

  if (channelOrder.length === 0) {
    return (
      <p className="text-text-soft px-3 py-4 text-label-xs leading-4">
        Add a channel step to this workflow to see matching agent integrations here.
      </p>
    );
  }

  if (integrationsQuery.isLoading) {
    return (
      <div className="flex flex-col gap-3 px-3 py-4">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-full" />
      </div>
    );
  }

  if (integrationsQuery.isError) {
    return (
      <p className="text-error-base px-3 py-4 text-label-xs leading-4">
        Could not load connected channels for this agent.
      </p>
    );
  }

  if (grouped.length === 0) {
    return (
      <p className="text-text-soft px-3 py-4 text-label-xs leading-4">
        This agent has no linked integrations matching this workflow&apos;s channel steps.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-3 py-4">
      {grouped.map(({ channel, items }) => (
        <div key={channel} className="flex flex-col gap-3">
          <p className="text-text-soft text-label-xs font-medium leading-4">{WORKFLOW_AGENT_CHANNEL_LABEL[channel]}</p>
          {items.map((link) => {
            const integration = link.integration;
            const providerMeta = novuProviders.find((provider) => provider.id === integration.providerId);
            const channelDisplayName = getAgentChannelDisplayName(
              integration.providerId,
              providerMeta?.displayName ?? integration.name
            );
            const isConnected = isAgentIntegrationConnected(link);

            return (
              <div key={link._id} className="flex items-center gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-1">
                  <ProviderIcon
                    providerId={integration.providerId}
                    providerDisplayName={channelDisplayName}
                    className="size-4 shrink-0"
                  />
                  <span className="text-text-sub text-label-xs truncate font-medium leading-4">
                    {channelDisplayName}
                  </span>
                </div>
                {isConnected ? (
                  <span className="text-text-soft font-code max-w-[150px] truncate text-label-xs tracking-tight">
                    {getIntegrationSecondaryLabel(link)}
                  </span>
                ) : (
                  <span className="text-warning-base flex shrink-0 items-center gap-0.5 text-label-2xs font-medium">
                    <RiErrorWarningFill className="size-3" />
                    Not set up
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
