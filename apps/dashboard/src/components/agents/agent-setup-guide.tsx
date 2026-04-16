import { ChatProviderIdEnum } from '@novu/shared';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { RiExpandUpDownLine } from 'react-icons/ri';
import { type AgentResponse, getAgentIntegrationsQueryKey, listAgentIntegrations } from '@/api/agents';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { cn } from '@/utils/ui';
import { AgentCodeSetupSection } from './agent-code-setup-section';
import { ProviderDropdown } from './provider-dropdown';
import { SetupStep } from './setup-guide-primitives';
import { deriveStepStatus } from './setup-guide-step-utils';
import { SlackSetupGuide } from './slack-setup-guide';
import { WhatsAppSetupGuide } from './whatsapp-setup-guide';

type AgentSetupGuideProps = {
  agent: AgentResponse;
};

function resolveProviderSetupGuide(providerId: string) {
  switch (providerId) {
    case ChatProviderIdEnum.Slack:
      return SlackSetupGuide;
    case ChatProviderIdEnum.WhatsAppBusiness:
      return WhatsAppSetupGuide;
    default:
      return null;
  }
}

function AgentSetupGuideComingSoon() {

  return (
    <div className="border-stroke-soft bg-bg-weak/30 flex flex-col items-center justify-center rounded-md border border-dashed px-6 py-12 text-center">
      <p className="text-text-strong text-label-sm font-medium">Coming soon</p>
      <p className="text-text-soft text-label-xs mt-2 max-w-sm leading-5">
        In-dashboard setup steps will return here as we expand agent tooling.
      </p>
    </div>
  );
}

export function AgentSetupGuide({ agent }: AgentSetupGuideProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string | undefined>(undefined);
  const [isProviderComplete, setIsProviderComplete] = useState(false);
  const { currentEnvironment } = useEnvironment();
  const { integrations } = useFetchIntegrations();

  const agentIntegrationsQuery = useQuery({
    queryKey: getAgentIntegrationsQueryKey(currentEnvironment?._id, agent.identifier),
    queryFn: () =>
      listAgentIntegrations({
        environment: requireEnvironment(currentEnvironment, 'No environment selected'),
        agentIdentifier: agent.identifier,
        limit: 100,
      }),
    enabled: Boolean(currentEnvironment && agent.identifier),
  });

  const hasConnectedIntegration = useMemo(() => {
    if (isProviderComplete) return true;

    const links = agentIntegrationsQuery.data?.data;
    if (!links?.length) return false;

    return links.some((link) => Boolean(link.connectedAt));
  }, [isProviderComplete, agentIntegrationsQuery.data?.data]);

  const defaultFromAgent = agent.integrations?.[0];

  const effectiveIntegrationId = selectedIntegrationId ?? defaultFromAgent?.integrationId;

  const selectedProviderId = useMemo(() => {
    if (selectedIntegrationId) {
      return integrations?.find((i) => i._id === selectedIntegrationId)?.providerId;
    }

    return defaultFromAgent?.providerId;
  }, [integrations, selectedIntegrationId, defaultFromAgent?.providerId]);

  const hasProviderSelected = Boolean(effectiveIntegrationId);

  const linkedIntegrationIds = useMemo(
    () => new Set(agent.integrations?.map((i) => i.integrationId) ?? []),
    [agent.integrations]
  );

  const firstIncompleteStepForProviderRow = hasProviderSelected ? 2 : 1;

  const ProviderGuide = selectedProviderId ? resolveProviderSetupGuide(selectedProviderId) : null;

  const handleProviderStepsCompleted = useCallback(() => {
    setIsProviderComplete(true);
  }, []);

  const isBridgeConnected = Boolean(agent.bridgeUrl || (agent.devBridgeActive && agent.devBridgeUrl));

  return (
    <div className="bg-bg-weak flex min-w-0 flex-1 flex-col rounded-[10px] p-1">
      <button
        type="button"
        className="flex w-full items-center justify-between px-2 py-1.5"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="text-text-soft text-[11px] font-medium uppercase leading-4 tracking-wider">Setup agent</span>
        <RiExpandUpDownLine className={cn('text-text-soft size-3 transition-transform', isExpanded && 'rotate-180')} />
      </button>

      {isExpanded && (
        <div className="bg-bg-white flex flex-col gap-0 overflow-hidden rounded-md p-3 shadow-[0px_0px_0px_1px_rgba(25,28,33,0.04),0px_1px_2px_0px_rgba(25,28,33,0.06),0px_0px_2px_0px_rgba(0,0,0,0.08)]">
          {isBridgeConnected ? (
            <AgentSetupGuideComingSoon />
          ) : (
            <div className="relative flex flex-col gap-10 py-6 pb-3 pl-8 pr-6">
              <div
                className="absolute bottom-0 left-[22px] top-0 w-px"
                style={{
                  background: 'linear-gradient(to bottom, transparent 0%, #E1E4EA 10%, #E1E4EA 90%, transparent 100%)',
                }}
              />

              <SetupStep
                index={1}
                status={deriveStepStatus(1, firstIncompleteStepForProviderRow)}
                sectionLabel="1/2 SETUP PROVIDER"
                title="Choose where your agent listens and communicates"
                description="Start with one provider your agent can receive and respond on and you can always add more providers as you need."
                rightContent={
                  <ProviderDropdown
                    agentIdentifier={agent.identifier}
                    selectedIntegrationId={selectedIntegrationId ?? defaultFromAgent?.integrationId}
                    linkedIntegrationIds={linkedIntegrationIds}
                    onSelect={(_providerId, integration) => {
                      if (integration?._id) {
                        setSelectedIntegrationId(integration._id);
                      }
                    }}
                  />
                }
              />

              {ProviderGuide && effectiveIntegrationId ? (
                <ProviderGuide
                  agent={agent}
                  integrationId={effectiveIntegrationId}
                  stepOffset={2}
                  embedded={false}
                  onStepsCompleted={handleProviderStepsCompleted}
                />
              ) : null}

              {hasConnectedIntegration && (
                <AgentCodeSetupSection agent={agent} stepOffset={5} isProviderComplete={hasConnectedIntegration} />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
