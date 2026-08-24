import { ChannelTypeEnum, EmailProviderIdEnum, type WorkflowAgentConfig } from '@novu/shared';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { getAgentIntegrationsQueryKey, listAgentIntegrations } from '@/api/agents';
import { useWorkflowAgentInboundAddresses } from '@/components/workflow-editor/use-workflow-agent-inbound-addresses';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';

type UseWorkflowAgentEmailDefaultsArgs = {
  agent: WorkflowAgentConfig | null | undefined;
};

export function useWorkflowAgentEmailDefaults({ agent }: UseWorkflowAgentEmailDefaultsArgs) {
  const agentIdentifier = agent?.identifier ?? null;
  const workflowReplyTo = agent?.providers?.[EmailProviderIdEnum.NovuAgent]?.replyTo;
  const { currentEnvironment } = useEnvironment();
  const { integrations } = useFetchIntegrations();
  const { addresses, primaryAddress, isLoading: isInboundLoading } = useWorkflowAgentInboundAddresses(agentIdentifier);

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

  const novuAgentLink = useMemo(
    () =>
      (integrationsQuery.data?.data ?? []).find(
        (link) =>
          link.integration.channel === ChannelTypeEnum.EMAIL &&
          link.integration.providerId === EmailProviderIdEnum.NovuAgent
      ),
    [integrationsQuery.data?.data]
  );

  const { senderName, senderEmail } = useMemo(() => {
    const credentials = novuAgentLink
      ? integrations?.find((integration) => integration._id === novuAgentLink.integration._id)?.credentials
      : undefined;

    const useOverride = Boolean(credentials?.useFromAddressOverride);
    const overrideFrom = credentials?.fromAddressOverride?.trim() || '';
    const outboundId = credentials?.outboundIntegrationId || '';
    const outboundFrom =
      integrations?.find((integration) => integration._id === outboundId)?.credentials?.from?.trim() ?? '';

    const sharedInbound = novuAgentLink?.integration.sharedInboundAddress?.trim() ?? '';
    const agentInbound = sharedInbound || primaryAddress || '';
    const resolvedEmail = (useOverride && overrideFrom ? overrideFrom : '') || agentInbound || outboundFrom;

    return {
      senderName: novuAgentLink?.integration.defaultSenderName?.trim() || '',
      senderEmail: resolvedEmail,
    };
  }, [novuAgentLink, integrations, primaryAddress]);

  const replyTo = useMemo(() => {
    if (workflowReplyTo && addresses.includes(workflowReplyTo)) {
      return workflowReplyTo;
    }

    return primaryAddress ?? '';
  }, [workflowReplyTo, addresses, primaryAddress]);

  return {
    agentIdentifier,
    senderName,
    senderEmail,
    replyTo,
    addresses,
    isLoading: Boolean(agentIdentifier) && (isInboundLoading || integrationsQuery.isLoading),
    isError: integrationsQuery.isError,
  };
}
