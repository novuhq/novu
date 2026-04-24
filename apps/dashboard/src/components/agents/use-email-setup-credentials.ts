import {
  DomainRouteTypeEnum,
  emailProviders as emailProviderConfigs,
  EmailProviderIdEnum,
  type IIntegration,
} from '@novu/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { type AgentResponse } from '@/api/agents';
import { type DomainResponse, type UpdateDomainBody, fetchDomains, updateDomain } from '@/api/domains';
import { showErrorToast } from '@/components/primitives/sonner-helpers';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { useUpdateIntegration } from '@/hooks/use-update-integration';
import { QueryKeys } from '@/utils/query-keys';

export const CATCH_ALL_ADDRESS = '*';

function deriveReplyDomain(localPart: string, domain: string): string | undefined {
  if (!localPart || !domain || localPart === CATCH_ALL_ADDRESS) return undefined;
  return `${localPart}@${domain}`;
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

  // domainId is a mutation variable (not a closure) so upsertAgentRoute can be
  // called with any domain at event time — useUpdateDomain can't be used here
  // because it bakes a single domainId into its mutationFn closure at call time.
  const { mutate: updateDomainRoutes } = useMutation({
    // biome-ignore lint/style/noNonNullAssertion: currentEnvironment is guaranteed non-null when triggered from a user interaction
    mutationFn: ({ domainId, body }: { domainId: string; body: UpdateDomainBody }) =>
      updateDomain(domainId, body, currentEnvironment!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchDomains, currentEnvironment?._id] });
    },
    onError: () => {
      showErrorToast('Could not create inbound route on the domain.', 'Route creation failed');
    },
  });

  const [outboundId, setOutboundId] = useState('');
  const [localPart, setLocalPart] = useState('');
  const [domainName, setDomainName] = useState('');
  const [replyFrom, setReplyFrom] = useState('');

  // Write-through cache keeps the full credentials snapshot between queued saves
  const serverCredentials = emailIntegration?.credentials ?? {};
  const credentialsRef = useRef<Record<string, unknown>>(serverCredentials as Record<string, unknown>);
  useEffect(() => {
    credentialsRef.current = { ...credentialsRef.current, ...serverCredentials };
  }, [emailIntegration]);

  // Initialize from server state once per unique integration ID.
  // Keying off _id (not the object) ensures re-hydration when the user switches
  // between integrations without the component remounting.
  const initializedForId = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!emailIntegration || initializedForId.current === emailIntegration._id) return;
    initializedForId.current = emailIntegration._id;
    const creds = emailIntegration.credentials ?? {};
    if (creds.outboundIntegrationId) setOutboundId(creds.outboundIntegrationId as string);
    if (creds.inboundAddress) setLocalPart(creds.inboundAddress as string);
    if (creds.inboundDomain) setDomainName(creds.inboundDomain as string);
    // Catch-all replyDomain can't be auto-computed, so restore it explicitly
    if (creds.inboundAddress === CATCH_ALL_ADDRESS && creds.replyDomain) {
      setReplyFrom(creds.replyDomain as string);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailIntegration?._id]);

  const domainsQuery = useQuery<DomainResponse[]>({
    queryKey: [QueryKeys.fetchDomains, currentEnvironment?._id],
    queryFn: () => fetchDomains(requireEnvironment(currentEnvironment, 'No environment selected')),
    enabled: Boolean(currentEnvironment),
  });
  const domains = domainsQuery.data ?? [];

  const outboundIntegration = useMemo(
    () => (outboundId ? integrations?.find((i) => i._id === outboundId) : undefined),
    [integrations, outboundId]
  );
  const isOutboundDemo = outboundIntegration?.providerId === EmailProviderIdEnum.Novu;
  const needsCredentialsStep = Boolean(outboundIntegration) && !isOutboundDemo;
  const outboundProviderConfig = useMemo(
    () => (outboundIntegration ? emailProviderConfigs.find((p) => p.id === outboundIntegration.providerId) : undefined),
    [outboundIntegration]
  );

  // Serialized save queue prevents out-of-order writes when multiple fields change quickly
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

  function upsertAgentRoute(address: string, domain: DomainResponse) {
    if (!currentEnvironment || !agent._id) return;
    const existingRoutes = domain.routes ?? [];
    if (existingRoutes.some((r) => r.address === address && r.type === DomainRouteTypeEnum.AGENT && r.destination === agent._id)) {
      return;
    }
    const updatedRoutes = [
      // Remove same-address AGENT routes AND any orphaned routes from this agent
      // (e.g. leftover 'wine-bot' route when the user switches to a different address)
      ...existingRoutes.filter(
        (r) => !(r.type === DomainRouteTypeEnum.AGENT && (r.address === address || r.destination === agent._id))
      ),
      { address, type: DomainRouteTypeEnum.AGENT, destination: agent._id },
    ];
    updateDomainRoutes({ domainId: domain._id, body: { routes: updatedRoutes } });
  }

  function onOutboundSelect(id: string) {
    setOutboundId(id);
    saveCredentials({ outboundIntegrationId: id });
  }

  function onLocalPartBlur() {
    if (!localPart || localPart === credentialsRef.current.inboundAddress) return;
    const isCatchAll = localPart === CATCH_ALL_ADDRESS;
    if (!isCatchAll) setReplyFrom('');
    const replyDomain = deriveReplyDomain(localPart, domainName);
    const patch: Record<string, unknown> = { inboundAddress: localPart };
    if (replyDomain) patch.replyDomain = replyDomain;
    // Explicitly clear any previously auto-computed replyDomain when entering catch-all mode
    else if (isCatchAll) patch.replyDomain = '';
    saveCredentials(patch);
    if (domainName) {
      const domain = domains.find((d) => d.name === domainName);
      if (domain) upsertAgentRoute(localPart, domain);
    }
  }

  function onDomainChange(name: string) {
    setDomainName(name);
    const replyDomain = deriveReplyDomain(localPart, name);
    saveCredentials({ inboundDomain: name, ...(replyDomain ? { replyDomain } : {}) });
    if (localPart) {
      const domain = domains.find((d) => d.name === name);
      if (domain) upsertAgentRoute(localPart, domain);
    }
  }

  function onReplyFromBlur() {
    if (!replyFrom || replyFrom === credentialsRef.current.replyDomain) return;
    saveCredentials({ replyDomain: replyFrom });
  }

  return {
    outboundId,
    localPart,
    domainName,
    replyFrom,
    domains,
    outboundIntegration,
    isOutboundDemo,
    needsCredentialsStep,
    outboundProviderConfig,
    setLocalPart,
    setReplyFrom,
    onOutboundSelect,
    onLocalPartBlur,
    onDomainChange,
    onReplyFromBlur,
  };
}
