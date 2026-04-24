import {
  DomainRouteTypeEnum,
  emailProviders as emailProviderConfigs,
  EmailProviderIdEnum,
  type IIntegration,
} from '@novu/shared';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type AgentResponse } from '@/api/agents';
import { type DomainResponse, fetchDomains, updateDomain } from '@/api/domains';
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

  const [outboundId, setOutboundId] = useState('');

  const serverCredentials = emailIntegration?.credentials ?? {};
  const credentialsRef = useRef<Record<string, unknown>>(serverCredentials as Record<string, unknown>);
  useEffect(() => {
    credentialsRef.current = { ...credentialsRef.current, ...serverCredentials };
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
    const creds = outboundIntegration.credentials ?? {};

    return Object.values(creds).some((v) => v !== undefined && v !== null && v !== '');
  }, [outboundIntegration]);
  const outboundProviderConfig = useMemo(
    () => (outboundIntegration ? emailProviderConfigs.find((p) => p.id === outboundIntegration.providerId) : undefined),
    [outboundIntegration]
  );

  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());

  function saveCredentials(patch: Record<string, unknown>) {
    if (!emailIntegration) return;
    credentialsRef.current = { ...credentialsRef.current, ...patch };
    const snapshot = { ...credentialsRef.current };
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
      .then(() => undefined)
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Could not save credentials.';
        showErrorToast(message, 'Settings not saved');
      });
  }

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

      const updatedRoutes = [
        ...existingRoutes,
        { address, type: DomainRouteTypeEnum.AGENT, destination: agent._id },
      ];
      updateDomain(domain._id, { routes: updatedRoutes }, currentEnvironment)
        .then(() => domainsQuery.refetch())
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : 'Could not create inbound route on the domain.';
          showErrorToast(message, 'Route creation failed');
        });
    },
    [currentEnvironment, agent._id, domains, domainsQuery]
  );

  const removeAddress = useCallback(
    (address: string, domainId: string) => {
      if (!currentEnvironment || !agent._id) return;
      const domain = domains.find((d) => d._id === domainId);
      if (!domain) return;
      const updatedRoutes = (domain.routes ?? []).filter(
        (r) => !(r.address === address && r.type === DomainRouteTypeEnum.AGENT && r.destination === agent._id)
      );
      updateDomain(domain._id, { routes: updatedRoutes }, currentEnvironment)
        .then(() => domainsQuery.refetch())
        .catch(() => {
          showErrorToast('Could not remove inbound route from the domain.', 'Route removal failed');
        });
    },
    [currentEnvironment, agent._id, domains, domainsQuery]
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
    refetchDomains: domainsQuery.refetch,
  };
}
