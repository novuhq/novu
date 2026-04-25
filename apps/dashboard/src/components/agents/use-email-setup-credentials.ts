import {
  DomainRouteTypeEnum,
  emailProviders as emailProviderConfigs,
  EmailProviderIdEnum,
  type IIntegration,
} from '@novu/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type AgentResponse } from '@/api/agents';
import { type DomainResponse, type UpdateDomainBody, fetchDomains, updateDomain } from '@/api/domains';
import { showErrorToast } from '@/components/primitives/sonner-helpers';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { useUpdateIntegration } from '@/hooks/use-update-integration';
import { QueryKeys } from '@/utils/query-keys';

export type ConfiguredAddress = {
  address: string;
  domain: string;
  domainId: string;
};

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

  const serverCredentials = emailIntegration?.credentials ?? {};
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
  }, [emailIntegration]);

  const hasInitializedFromServer = useRef(false);
  useEffect(() => {
    if (!emailIntegration || hasInitializedFromServer.current) return;
    hasInitializedFromServer.current = true;
    const creds = emailIntegration.credentials ?? {};
    if (creds.outboundIntegrationId) setOutboundId(creds.outboundIntegrationId as string);
  }, [emailIntegration]);

  const domainsQuery = useQuery<DomainResponse[]>({
    queryKey: [QueryKeys.fetchDomains, currentEnvironment?._id],
    queryFn: () => fetchDomains(requireEnvironment(currentEnvironment, 'No environment selected')),
    enabled: Boolean(currentEnvironment),
  });
  const domains = domainsQuery.data ?? [];

  const configuredAddresses = useMemo<ConfiguredAddress[]>(() => {
    if (!agent._id) return [];

    const result: ConfiguredAddress[] = [];
    for (const domain of domains) {
      for (const route of domain.routes ?? []) {
        if (route.type === DomainRouteTypeEnum.AGENT && route.destination === agent._id) {
          result.push({ address: route.address, domain: domain.name, domainId: domain._id });
        }
      }
    }

    return result;
  }, [domains, agent._id]);

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
    mutationFn: ({ domainId, body }: { domainId: string; body: UpdateDomainBody }) =>
      updateDomain(domainId, body, requireEnvironment(currentEnvironment, 'No environment selected')),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchDomains, currentEnvironment?._id] });
    },
  });

  const addAddress = useCallback(
    (address: string, domain: DomainResponse) => {
      if (!currentEnvironment || !agent._id) return;
      const existingRoutes = domain.routes ?? [];

      const ownRoute = existingRoutes.find(
        (r) => r.address === address && r.type === DomainRouteTypeEnum.AGENT && r.destination === agent._id
      );
      if (ownRoute) return;

      const conflicting = existingRoutes.find(
        (r) => r.address === address && r.type === DomainRouteTypeEnum.AGENT && r.destination !== agent._id
      );
      if (conflicting) {
        showErrorToast(
          `"${address}@${domain.name}" is already routed to another agent. Each address can only route to one agent.`,
          'Address already in use'
        );

        return;
      }

      mutateDomainRoutes(
        {
          domainId: domain._id,
          body: {
            routes: [...existingRoutes, { address, type: DomainRouteTypeEnum.AGENT, destination: agent._id }],
          },
        },
        {
          onError: (err) => {
            const message = err instanceof Error ? err.message : 'Could not create inbound route on the domain.';
            showErrorToast(message, 'Route creation failed');
          },
        }
      );
    },
    [currentEnvironment, agent._id, mutateDomainRoutes]
  );

  const removeAddress = useCallback(
    (address: string, domainId: string) => {
      if (!currentEnvironment || !agent._id) return;
      const domain = domains.find((d) => d._id === domainId);
      if (!domain) return;
      const updatedRoutes = (domain.routes ?? []).filter(
        (r) => !(r.address === address && r.type === DomainRouteTypeEnum.AGENT && r.destination === agent._id)
      );
      mutateDomainRoutes(
        { domainId: domain._id, body: { routes: updatedRoutes } },
        {
          onError: () => {
            showErrorToast('Could not remove inbound route from the domain.', 'Route removal failed');
          },
        }
      );
    },
    [currentEnvironment, agent._id, domains, mutateDomainRoutes]
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
