import { ChannelTypeEnum, DomainRouteTypeEnum, EmailProviderIdEnum, type IEnvironment } from '@novu/shared';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { getAgent, getAgentDetailQueryKey, getAgentIntegrationsQueryKey, listAgentIntegrations } from '@/api/agents';
import { type DomainResponse, fetchDomainRoutes, fetchDomains } from '@/api/domains';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';

async function fetchAllDomains(environment: IEnvironment) {
  const domains: DomainResponse[] = [];
  let after: string | undefined;

  do {
    const response = await fetchDomains(environment, {
      limit: 100,
      ...(after ? { after } : {}),
    });
    domains.push(...response.data);
    after = response.next ?? undefined;
  } while (after);

  return domains;
}

async function fetchCustomDomainAddresses(environment: IEnvironment, agentMongoId: string, agentIdentifier: string) {
  const domains = await fetchAllDomains(environment);
  const addresses: string[] = [];

  for (const domain of domains) {
    let after: string | undefined;

    do {
      const response = await fetchDomainRoutes(domain.name, environment, {
        limit: 100,
        agentId: agentIdentifier,
        ...(after ? { after } : {}),
      });

      for (const route of response.data) {
        if (route.type !== DomainRouteTypeEnum.AGENT) {
          continue;
        }

        if (route.agentId !== agentMongoId) {
          continue;
        }

        if (!route.address || route.address === '*') {
          continue;
        }

        addresses.push(`${route.address}@${domain.name}`);
      }

      after = response.next ?? undefined;
    } while (after);
  }

  return addresses;
}

/**
 * Digestible inbound addresses for a workflow-assigned agent, ordered by preference:
 * shared inbox first, then custom-domain agent routes.
 */
export function useWorkflowAgentInboundAddresses(agentIdentifier: string | null | undefined) {
  const { currentEnvironment } = useEnvironment();

  const agentQuery = useQuery({
    queryKey: getAgentDetailQueryKey(currentEnvironment?._id, agentIdentifier ?? undefined),
    queryFn: () => getAgent(requireEnvironment(currentEnvironment, 'No environment selected'), agentIdentifier ?? ''),
    enabled: Boolean(currentEnvironment && agentIdentifier),
    retry: false,
  });

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

  const customAddressesQuery = useQuery({
    queryKey: ['workflow-agent-inbound-custom', currentEnvironment?._id, agentIdentifier, agentQuery.data?._id],
    queryFn: () =>
      fetchCustomDomainAddresses(
        requireEnvironment(currentEnvironment, 'No environment selected'),
        agentQuery.data?._id ?? '',
        agentIdentifier ?? ''
      ),
    enabled: Boolean(currentEnvironment && agentIdentifier && agentQuery.data?._id),
  });

  const addresses = useMemo(() => {
    const result: string[] = [];

    const emailLinks = (integrationsQuery.data?.data ?? []).filter(
      (link) =>
        link.integration.channel === ChannelTypeEnum.EMAIL &&
        link.integration.providerId === EmailProviderIdEnum.NovuAgent
    );

    for (const link of emailLinks) {
      if (link.integration.sharedInboxDisabled) {
        continue;
      }

      const shared = link.integration.sharedInboundAddress?.trim();
      if (shared && !result.includes(shared)) {
        result.push(shared);
      }
    }

    for (const address of customAddressesQuery.data ?? []) {
      if (!result.includes(address)) {
        result.push(address);
      }
    }

    return result;
  }, [integrationsQuery.data?.data, customAddressesQuery.data]);

  return {
    addresses,
    primaryAddress: addresses[0],
    isLoading:
      Boolean(agentIdentifier) &&
      (agentQuery.isLoading || integrationsQuery.isLoading || customAddressesQuery.isLoading),
    isError: agentQuery.isError || integrationsQuery.isError || customAddressesQuery.isError,
  };
}
