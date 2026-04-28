import {
  DomainRouteTypeEnum,
  EmailProviderIdEnum,
  emailProviders as emailProviderConfigs,
  type IEnvironment,
  type IIntegration,
} from '@novu/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type AgentResponse } from '@/api/agents';
import {
  createDomainRoute,
  type DomainResponse,
  type DomainRouteResponse,
  deleteDomainRoute,
  fetchDomainRoutes,
  fetchDomains,
} from '@/api/domains';
import { showErrorToast } from '@/components/primitives/sonner-helpers';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { useUpdateIntegration } from '@/hooks/use-update-integration';
import { QueryKeys } from '@/utils/query-keys';

export type ConfiguredAddress = {
  address: string;
  domain: string;
  domainId: string;
  routeId: string;
};

async function fetchAllRoutesForAgentIdentifierOnDomain(
  environment: IEnvironment,
  domain: string,
  agentIdentifier: string
) {
  const routes: DomainRouteResponse[] = [];
  let after: string | undefined;

  do {
    const response = await fetchDomainRoutes(domain, environment, {
      limit: 100,
      agentId: agentIdentifier,
      ...(after ? { after } : {}),
    });
    routes.push(...response.data);
    after = response.next ?? undefined;
  } while (after);

  return routes;
}

async function fetchAllRoutesForAgentIdentifier(
  environment: IEnvironment,
  agentIdentifier: string,
  domains: DomainResponse[]
) {
  const perDomain = await Promise.all(
    domains.map((domain) => fetchAllRoutesForAgentIdentifierOnDomain(environment, domain.name, agentIdentifier))
  );

  return perDomain.flat();
}

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

export function useEmailSetupCredentials({
  emailIntegration,
  integrations,
  agent,
}: {
  emailIntegration: IIntegration | undefined;
  integrations: IIntegration[] | undefined;
  agent: AgentResponse;
}) {
  const { currentEnvironment } = useEnvironment();
  const { mutateAsync: updateIntegration } = useUpdateIntegration();
  const queryClient = useQueryClient();

  const [outboundId, setOutboundId] = useState('');

  const serverCredentials = useMemo(() => emailIntegration?.credentials ?? {}, [emailIntegration?.credentials]);
  const credentialsRef = useRef<Record<string, unknown>>(serverCredentials as Record<string, unknown>);
  const pendingKeysRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const merged = { ...serverCredentials } as Record<string, unknown>;
    for (const [key, value] of Object.entries(credentialsRef.current)) {
      if (pendingKeysRef.current.has(key)) {
        merged[key] = value;
      }
    }
    credentialsRef.current = merged;
  }, [serverCredentials]);

  const hasInitializedFromServer = useRef(false);
  useEffect(() => {
    if (!emailIntegration || hasInitializedFromServer.current) return;
    hasInitializedFromServer.current = true;
    const creds = emailIntegration.credentials ?? {};
    if (creds.outboundIntegrationId) setOutboundId(creds.outboundIntegrationId as string);
  }, [emailIntegration]);

  const domainsQuery = useQuery<DomainResponse[]>({
    queryKey: [QueryKeys.fetchDomains, currentEnvironment?._id],
    queryFn: () => fetchAllDomains(requireEnvironment(currentEnvironment, 'No environment selected')),
    enabled: Boolean(currentEnvironment),
  });
  const domains = useMemo(() => domainsQuery.data ?? [], [domainsQuery.data]);
  const domainNames = useMemo(() => domains.map((domain) => domain.name), [domains]);

  const routesQuery = useQuery({
    queryKey: [QueryKeys.fetchDomainRoutes, currentEnvironment?._id, agent.identifier, domainNames],
    queryFn: () =>
      fetchAllRoutesForAgentIdentifier(
        requireEnvironment(currentEnvironment, 'No environment selected'),
        agent.identifier,
        domains
      ),
    enabled: Boolean(currentEnvironment && agent.identifier && domainsQuery.isSuccess),
  });
  const agentRoutes = routesQuery.data ?? [];

  const configuredAddresses = useMemo<ConfiguredAddress[]>(() => {
    if (!agent._id) return [];

    const domainNamesById = new Map(domains.map((domain) => [domain._id, domain.name]));

    return agentRoutes
      .filter((route) => route.type === DomainRouteTypeEnum.AGENT && route.agentId === agent._id)
      .map((route) => ({
        address: route.address,
        domain: domainNamesById.get(route._domainId) ?? '',
        domainId: route._domainId,
        routeId: route._id,
      }))
      .filter((address) => address.domain);
  }, [domains, agentRoutes, agent._id]);

  const outboundIntegration = useMemo(
    () => (outboundId ? integrations?.find((i) => i._id === outboundId) : undefined),
    [integrations, outboundId]
  );
  const isOutboundDemo = outboundIntegration?.providerId === EmailProviderIdEnum.Novu;
  const needsCredentialsStep = Boolean(outboundIntegration) && !isOutboundDemo;
  const hasOutboundCredentials = useMemo(() => {
    if (!outboundIntegration) return false;
    const providerConfig = emailProviderConfigs.find((p) => p.id === outboundIntegration.providerId);
    if (!providerConfig) return false;
    const requiredKeys = providerConfig.credentials.filter((c) => c.required).map((c) => c.key);
    if (requiredKeys.length === 0) return true;
    const creds = (outboundIntegration.credentials ?? {}) as Record<string, unknown>;

    return requiredKeys.every((key) => {
      const val = creds[key];

      return val !== undefined && val !== null && val !== '';
    });
  }, [outboundIntegration]);
  const outboundProviderConfig = useMemo(
    () => (outboundIntegration ? emailProviderConfigs.find((p) => p.id === outboundIntegration.providerId) : undefined),
    [outboundIntegration]
  );

  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());

  function saveCredentials(patch: Record<string, unknown>) {
    if (!emailIntegration) return;
    credentialsRef.current = { ...credentialsRef.current, ...patch };
    for (const key of Object.keys(patch)) pendingKeysRef.current.add(key);
    const snapshot = { ...credentialsRef.current };
    const patchKeys = Object.keys(patch);
    saveQueueRef.current = saveQueueRef.current
      .then(() =>
        updateIntegration({
          integrationId: emailIntegration._id,
          data: {
            name: emailIntegration.name,
            identifier: emailIntegration.identifier,
            active: emailIntegration.active,
            primary: emailIntegration.primary ?? false,
            credentials: snapshot,
            configurations: {},
            check: false,
          },
        })
      )
      .then(() => {
        for (const key of patchKeys) pendingKeysRef.current.delete(key);
      })
      .catch((err: unknown) => {
        for (const key of patchKeys) pendingKeysRef.current.delete(key);
        const message = err instanceof Error ? err.message : 'Could not save credentials.';
        showErrorToast(message, 'Settings not saved');
      });
  }

  const { mutate: mutateDomainRoutes } = useMutation({
    mutationFn: ({ domain, address }: { domain: string; address: string }) =>
      createDomainRoute(
        domain,
        { address, type: DomainRouteTypeEnum.AGENT, agentId: agent.identifier },
        requireEnvironment(currentEnvironment, 'No environment selected')
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchDomains, currentEnvironment?._id] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchDomainRoutes] });
    },
  });

  const { mutate: removeDomainRoute } = useMutation({
    mutationFn: ({ domain, address }: { domain: string; address: string }) =>
      deleteDomainRoute(domain, address, requireEnvironment(currentEnvironment, 'No environment selected')),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchDomainRoutes] });
    },
  });

  const addAddress = useCallback(
    (address: string, domain: DomainResponse) => {
      if (!currentEnvironment || !agent._id) return;

      const ownRoute = agentRoutes.find(
        (route) =>
          route._domainId === domain._id &&
          route.address === address &&
          route.type === DomainRouteTypeEnum.AGENT &&
          route.agentId === agent._id
      );
      if (ownRoute) return;

      mutateDomainRoutes(
        {
          domain: domain.name,
          address,
        },
        {
          onError: (err) => {
            const message = err instanceof Error ? err.message : 'Could not create inbound route on the domain.';
            showErrorToast(message, 'Route creation failed');
          },
        }
      );
    },
    [currentEnvironment, agent._id, agentRoutes, mutateDomainRoutes]
  );

  const removeAddress = useCallback(
    (address: string, domainId: string) => {
      if (!currentEnvironment || !agent._id) return;
      const domain = domains.find((item) => item._id === domainId);
      const route = agentRoutes.find(
        (item) =>
          item._domainId === domainId &&
          item.address === address &&
          item.type === DomainRouteTypeEnum.AGENT &&
          item.agentId === agent._id
      );

      if (!route) return;
      if (!domain) return;

      removeDomainRoute(
        { domain: domain.name, address: route.address },
        {
          onError: () => {
            showErrorToast('Could not remove inbound route from the domain.', 'Route removal failed');
          },
        }
      );
    },
    [currentEnvironment, agent._id, agentRoutes, domains, removeDomainRoute]
  );

  function onOutboundSelect(id: string) {
    setOutboundId(id);
    saveCredentials({ outboundIntegrationId: id });
  }

  return {
    outboundId,
    configuredAddresses,
    domains,
    outboundIntegration,
    isOutboundDemo,
    needsCredentialsStep,
    hasOutboundCredentials,
    outboundProviderConfig,
    onOutboundSelect,
    addAddress,
    removeAddress,
  };
}
