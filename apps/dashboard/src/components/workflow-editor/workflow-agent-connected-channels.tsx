import { ChannelTypeEnum, providers as novuProviders } from '@novu/shared';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { RiErrorWarningFill } from 'react-icons/ri';
import { type AgentIntegrationLink, getAgentIntegrationsQueryKey, listAgentIntegrations } from '@/api/agents';
import { isAgentIntegrationConnected } from '@/components/agents/is-agent-integration-connected';
import { ProviderIcon } from '@/components/integrations/components/provider-icon';
import { Skeleton } from '@/components/primitives/skeleton';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { getAgentChannelDisplayName } from '@/utils/agent-email-provider-display';
import { CHANNEL_TYPE_TO_STRING } from '@/utils/channels';

type WorkflowAgentConnectedChannelsProps = {
  agentIdentifier: string | null | undefined;
};

/** Matches agent integrations tab channel group order. */
const CHANNEL_GROUP_ORDER: ChannelTypeEnum[] = [
  ChannelTypeEnum.IN_APP,
  ChannelTypeEnum.CHAT,
  ChannelTypeEnum.EMAIL,
  ChannelTypeEnum.PUSH,
  ChannelTypeEnum.SMS,
];

function getIntegrationSecondaryLabel(link: AgentIntegrationLink): string {
  const integration = link.integration;

  if (integration.channel === ChannelTypeEnum.EMAIL && integration.sharedInboundAddress) {
    return integration.sharedInboundAddress;
  }

  return integration.identifier;
}

function groupLinksByChannel(links: AgentIntegrationLink[]) {
  const map = new Map<ChannelTypeEnum, AgentIntegrationLink[]>();

  for (const link of links) {
    const list = map.get(link.integration.channel) ?? [];
    list.push(link);
    map.set(link.integration.channel, list);
  }

  const groups: { channel: ChannelTypeEnum; items: AgentIntegrationLink[] }[] = [];

  for (const channel of CHANNEL_GROUP_ORDER) {
    const items = map.get(channel);

    if (items?.length) {
      groups.push({ channel, items });
    }
  }

  return groups;
}

/*
 * Lists every integration the agent has, not only the channels the workflow currently steps
 * through: the preview answers "what can this agent send and reply on", so a channel the agent
 * supports stays visible before a matching step exists.
 */
export function WorkflowAgentConnectedChannels({ agentIdentifier }: WorkflowAgentConnectedChannelsProps) {
  const { currentEnvironment } = useEnvironment();

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

  const grouped = useMemo(
    () => groupLinksByChannel(integrationsQuery.data?.data ?? []),
    [integrationsQuery.data?.data]
  );

  if (!agentIdentifier) {
    return (
      <p className="text-text-soft px-3 py-4 text-label-xs leading-4">
        Select an agent to preview its connected channels.
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
      <p className="text-text-soft px-3 py-4 text-label-xs leading-4">This agent has no connected channels yet.</p>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-3 py-4">
      {grouped.map(({ channel, items }) => (
        <div key={channel} className="flex flex-col gap-3">
          <p className="text-text-soft text-label-xs font-medium leading-4">{CHANNEL_TYPE_TO_STRING[channel]}</p>
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
