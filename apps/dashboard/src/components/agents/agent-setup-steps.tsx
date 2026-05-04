import { ChatProviderIdEnum, EmailProviderIdEnum } from '@novu/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RiExpandUpDownLine } from 'react-icons/ri';
import { useLocation, useNavigate } from 'react-router-dom';
import { type AgentResponse, getAgentIntegrationsQueryKey, listAgentIntegrations } from '@/api/agents';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { buildRoute, ROUTES } from '@/utils/routes';
import { AgentCodeSetupSection } from './agent-code-setup-section';
import { EmailSetupGuide } from './email-setup-guide';
import { ProviderDropdown } from './provider-dropdown';
import { SetupStep } from './setup-guide-primitives';
import { deriveStepStatus } from './setup-guide-step-utils';
import { SlackSetupGuide } from './slack-setup-guide';
import { TeamsSetupGuide } from './teams-setup-guide';
import { WhatsAppSetupGuide } from './whatsapp-setup-guide';

function resolveProviderSetupGuide(providerId: string) {
  switch (providerId) {
    case ChatProviderIdEnum.Slack:
      return SlackSetupGuide;
    case ChatProviderIdEnum.MsTeams:
      return TeamsSetupGuide;
    case ChatProviderIdEnum.WhatsAppBusiness:
      return WhatsAppSetupGuide;
    case EmailProviderIdEnum.NovuAgent:
      return EmailSetupGuide;
    default:
      return null;
  }
}

const SESSION_KEY = (agentIdentifier: string) => `agent-setup-integration:${agentIdentifier}`;

type AgentSetupStepsProps = {
  agent: AgentResponse;
  onBridgeConnected?: () => void;
  hideAddProvider?: boolean;
};

function CollapsedProviderSection({
  expanded,
  onToggle,
  visible,
}: {
  expanded: boolean;
  onToggle: () => void;
  visible: boolean;
}) {
  if (!visible) return null;

  return (
    <div className="relative flex items-center pl-6">
      <div className="absolute -left-[20px] flex w-5 justify-center">
        <div className="flex size-5 shrink-0 items-center justify-center rounded-full border border-success-dark bg-success-base shadow-[0px_0px_0px_1px_hsl(var(--static-white)),0px_0px_0px_2px_hsl(var(--stroke-soft))]">
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className="text-text-sub hover:text-text-strong flex cursor-pointer items-center gap-1 transition-colors"
      >
        <span className="text-label-xs font-medium">{expanded ? 'Hide instructions' : 'View all instructions'}</span>
        <RiExpandUpDownLine className="size-4" />
      </button>
    </div>
  );
}

export function AgentSetupSteps({ agent, onBridgeConnected, hideAddProvider }: AgentSetupStepsProps) {
  const { currentEnvironment } = useEnvironment();
  const { integrations } = useFetchIntegrations();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string | undefined>(
    () => sessionStorage.getItem(SESSION_KEY(agent.identifier)) ?? undefined
  );

  const validatedSelectedId = useMemo(() => {
    if (!selectedIntegrationId) return undefined;
    if (!integrations) return undefined;

    return integrations.some((i) => i._id === selectedIntegrationId) ? selectedIntegrationId : undefined;
  }, [selectedIntegrationId, integrations]);

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
    const links = agentIntegrationsQuery.data?.data;
    if (!links?.length) return false;

    return links.some((link) => Boolean(link.connectedAt));
  }, [agentIntegrationsQuery.data?.data]);

  const [userExpandedProvider, setUserExpandedProvider] = useState(false);
  const isProviderExpanded = !hasConnectedIntegration || userExpandedProvider;

  useEffect(() => {
    if (!hasConnectedIntegration) {
      setUserExpandedProvider(false);
    }
  }, [hasConnectedIntegration]);

  const defaultFromAgent = agent.integrations?.[0];
  const effectiveIntegrationId = validatedSelectedId ?? defaultFromAgent?.integrationId;

  useEffect(() => {
    if (defaultFromAgent?.integrationId) {
      sessionStorage.removeItem(SESSION_KEY(agent.identifier));
    }
  }, [defaultFromAgent?.integrationId, agent.identifier]);

  const selectedProviderId = useMemo(() => {
    if (validatedSelectedId) {
      return integrations?.find((i) => i._id === validatedSelectedId)?.providerId;
    }

    return defaultFromAgent?.providerId;
  }, [integrations, validatedSelectedId, defaultFromAgent?.providerId]);

  const hasProviderSelected = Boolean(effectiveIntegrationId);

  const linkedIntegrationIds = useMemo(
    () => new Set(agent.integrations?.map((i) => i.integrationId) ?? []),
    [agent.integrations]
  );

  const firstIncompleteStep = hasProviderSelected ? 2 : 1;

  const ProviderGuide = selectedProviderId ? resolveProviderSetupGuide(selectedProviderId) : null;

  const handleProviderStepsCompleted = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: getAgentIntegrationsQueryKey(currentEnvironment?._id, agent.identifier),
    });
  }, [queryClient, currentEnvironment?._id, agent.identifier]);

  const handleAddProvider = useCallback(() => {
    if (!currentEnvironment?.slug) return;

    navigate(
      `${buildRoute(ROUTES.AGENT_DETAILS_TAB, {
        environmentSlug: currentEnvironment.slug,
        agentIdentifier: encodeURIComponent(agent.identifier),
        agentTab: 'integrations',
      })}${location.search}`
    );
  }, [agent.identifier, currentEnvironment?.slug, location.search, navigate]);

  return (
    <div className="relative flex flex-col gap-10 py-6 pb-3 pl-8 pr-6">
      <div
        className="absolute bottom-0 left-[22px] top-0 w-px"
        style={{
          background: 'linear-gradient(to bottom, transparent 0%, #E1E4EA 10%, #E1E4EA 90%, transparent 100%)',
        }}
      />

      <CollapsedProviderSection
        expanded={isProviderExpanded}
        onToggle={() => setUserExpandedProvider((prev) => !prev)}
        visible={hasConnectedIntegration}
      />

      <motion.div
        initial={false}
        animate={{ height: isProviderExpanded ? 'auto' : 0, opacity: isProviderExpanded ? 1 : 0 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        style={{ clipPath: 'inset(0 -100% -100% -100%)' }}
      >
        <div className="flex flex-col gap-10">
          <SetupStep
            index={1}
            status={deriveStepStatus(1, firstIncompleteStep)}
            sectionLabel="1/2 SETUP PROVIDER"
            title="Choose where your agent listens and communicates"
            description="Start with one provider your agent can receive and respond on and you can always add more providers as you need."
            rightContent={
              <ProviderDropdown
                agentIdentifier={agent.identifier}
                agentName={agent.name}
                selectedIntegrationId={validatedSelectedId ?? defaultFromAgent?.integrationId}
                linkedIntegrationIds={linkedIntegrationIds}
                onSelect={(_providerId, integration) => {
                  if (integration?._id) {
                    setSelectedIntegrationId(integration._id);
                    sessionStorage.setItem(SESSION_KEY(agent.identifier), integration._id);
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
        </div>
      </motion.div>

      {hasConnectedIntegration && (
        <AgentCodeSetupSection agent={agent} stepOffset={5} providerId={selectedProviderId} onBridgeConnected={onBridgeConnected} onAddProvider={hideAddProvider ? undefined : handleAddProvider} />
      )}
    </div>
  );
}
