import { ChatProviderIdEnum, EmailProviderIdEnum, type IIntegration } from '@novu/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RiExpandUpDownLine } from 'react-icons/ri';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  type AgentResponse,
  getAgentIntegrationsQueryKey,
  listAgentIntegrations,
  sendAgentWelcomeMessage,
} from '@/api/agents';
import { ConnectAgentForm } from '@/components/onboarding/connect-agent/connect-agent-form';
import {
  type ConnectSummary,
  deriveConnectSummaryDisplay,
} from '@/components/onboarding/connect-agent/connect-summary';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { useAgentRoutes } from '@/hooks/use-agent-routes';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { useTelemetry } from '@/hooks/use-telemetry';
import { buildRoute } from '@/utils/routes';
import { TelemetryEvent } from '@/utils/telemetry';
import { AgentCodeSetupSection } from './agent-code-setup-section';
import { EmailInboundAddressStep } from './email-inbound-address-step';
import { EmailSetupGuide } from './email-setup-guide';
import { ProviderCards } from './provider-cards';
import { SetupStep } from './setup-guide-primitives';
import { deriveStepStatus } from './setup-guide-step-utils';
import { SlackSetupGuide } from './slack-setup-guide';
import { TeamsSetupGuide } from './teams-setup-guide';
import { TelegramSetupGuide } from './telegram-setup-guide';
import { WhatsAppSetupGuide } from './whatsapp-setup-guide';

const noop = () => {};

function resolveProviderSetupGuide(providerId: string) {
  switch (providerId) {
    case ChatProviderIdEnum.Slack:
      return SlackSetupGuide;
    case ChatProviderIdEnum.MsTeams:
      return TeamsSetupGuide;
    case ChatProviderIdEnum.WhatsAppBusiness:
      return WhatsAppSetupGuide;
    case ChatProviderIdEnum.Telegram:
      return TelegramSetupGuide;
    case EmailProviderIdEnum.NovuAgent:
      return EmailSetupGuide;
    default:
      return null;
  }
}

const SESSION_KEY = (agentIdentifier: string) => `agent-setup-integration:${agentIdentifier}`;

// Brain section steps (connector + template/prompt) live in `connect-agent-form` and only
// appear in the onboarding flow above this component.
const BRAIN_STEPS = 2;
// Provider guides reserve up to three numbered steps; the bridge section continues from there.
const PROVIDER_GUIDE_RESERVED_STEPS = 3;
// Self-hosted agents add three handler steps (scaffold + run + send) below the provider guide.
const HANDLER_STEPS = 3;

type AgentSetupStepsProps = {
  agent: AgentResponse;
  /**
   * Fires once when the agent is considered "fully set up":
   * - managed runtimes: as soon as the chosen provider integration is connected
   * - other runtimes: when the user's bridge endpoint becomes reachable
   */
  onSetupComplete?: () => void;
  /** Called when a non-email-auto-provisioned channel becomes connected during onboarding. */
  onChannelConnected?: (providerId: string) => void;
  hideAddProvider?: boolean;
  /**
   * Onboarding flow only: the connector + template the user picked in the connect phase,
   * used to render the "View all instructions" recap above the channel step.
   */
  connectSummary?: ConnectSummary | null;
};

function ViewAllInstructionsToggle({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  return (
    <div className="relative flex items-center pl-6">
      <div className="absolute -left-[20px] flex w-5 justify-center">
        <div className="border-success-dark bg-success-base flex size-5 shrink-0 items-center justify-center rounded-full shadow-[0px_0px_0px_1px_hsl(var(--static-white)),0px_0px_0px_2px_hsl(var(--stroke-soft))] border">
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
        <span className="text-label-xs font-medium">
          {expanded ? 'Hide all instructions' : 'View all instructions'}
        </span>
        <RiExpandUpDownLine className="size-4" />
      </button>
    </div>
  );
}

function ConnectPhaseRecap({
  summary,
  integrations,
}: {
  summary: ConnectSummary;
  integrations: IIntegration[] | undefined;
}) {
  const display = deriveConnectSummaryDisplay(summary, integrations);

  return (
    <div className="flex flex-col gap-10">
      <ConnectAgentForm
        connectorId={summary.connectorId}
        isClaudeSelected={display.isClaudeSelected}
        isScratchRuntime={display.isScratchRuntime}
        apiKey={summary.apiKey}
        externalWorkspaceId={summary.externalWorkspaceId}
        region={summary.region ?? ''}
        templateSelection={summary.templateSelection}
        isExistingMode={display.isExistingMode}
        isScratchMode={display.isScratchMode}
        showExistingOption={display.showExistingOption}
        existingOptionIcon={display.existingOptionIcon}
        name={summary.name}
        identifier={summary.identifier}
        instructions={summary.instructions}
        isIdentifierTouched
        externalAgentId={summary.externalAgentId}
        externalEnvironmentId={summary.externalEnvironmentId}
        errors={{}}
        disabled
        integrations={integrations}
        selectedIntegrationId={summary.selectedIntegrationId}
        dropdownStatus={summary.selectedIntegrationId ? 'valid' : 'idle'}
        showSavedBadge={false}
        credentialsPanelVisible={false}
        credentialsPanelExpanded={false}
        integrationName={summary.integrationName ?? ''}
        verifyStatus="idle"
        verifyMessage={undefined}
        isSavingIntegration={false}
        onConnectorChange={noop}
        onTemplateChange={noop}
        onApiKeyChange={noop}
        onExternalWorkspaceIdChange={noop}
        onRegionChange={noop}
        onNameChange={noop}
        onIdentifierChange={noop}
        onIdentifierTouched={noop}
        onInstructionsChange={noop}
        onExternalAgentIdChange={noop}
        onExternalEnvironmentIdChange={noop}
        onSelectIntegration={noop}
        onRequestSetupCredentials={noop}
        onCredentialsExpandedChange={noop}
        onIntegrationNameChange={noop}
        onVerify={noop}
        onSaveIntegration={noop}
      />
    </div>
  );
}

export function AgentSetupSteps({
  agent,
  onSetupComplete,
  onChannelConnected,
  hideAddProvider,
  connectSummary,
}: AgentSetupStepsProps) {
  const telemetry = useTelemetry();
  const { currentEnvironment } = useEnvironment();
  const { integrations } = useFetchIntegrations();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const agentRoutes = useAgentRoutes();
  const [searchParams, setSearchParams] = useSearchParams();
  // Tracks the last conversationId for which a bridge-connected message was sent,
  // scoping dedup per conversation rather than globally for the component lifetime.
  const lastSentConversationIdRef = useRef<string | null>(null);
  // Updated every render so handleBridgeConnected can read the latest value
  // without adding searchParams to its dependency array.
  const onboardingConversationIdRef = useRef<string | null>(null);
  onboardingConversationIdRef.current = searchParams.get('onboardingConversationId');

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

    // The novu-email-agent integration is auto-provisioned for every agent, so
    // it must not count toward marking the provider setup step as completed.
    return links.some(
      (link) => Boolean(link.connectedAt) && link.integration.providerId !== EmailProviderIdEnum.NovuAgent
    );
  }, [agentIntegrationsQuery.data?.data]);

  const [isInstructionsExpanded, setIsInstructionsExpanded] = useState(false);

  const defaultFromAgent = agent.integrations?.[0];
  const effectiveIntegrationId = validatedSelectedId ?? defaultFromAgent?.integrationId;

  useEffect(() => {
    if (defaultFromAgent?.integrationId) {
      sessionStorage.removeItem(SESSION_KEY(agent.identifier));
    }
  }, [defaultFromAgent?.integrationId, agent.identifier]);

  const selectedIntegration = useMemo(() => {
    if (validatedSelectedId) {
      return integrations?.find((i) => i._id === validatedSelectedId);
    }

    return undefined;
  }, [integrations, validatedSelectedId]);

  const selectedProviderId = selectedIntegration?.providerId ?? defaultFromAgent?.providerId;

  const hasProviderSelected = Boolean(effectiveIntegrationId);

  const agentIntegrationLinks = useMemo(
    () => agentIntegrationsQuery.data?.data ?? [],
    [agentIntegrationsQuery.data?.data]
  );

  // The auto-provisioned NovuAgent integration link carries the cloud shared
  // inbound address (`{slug}-{key}@{NOVU_AGENT_SHARED_INBOUND_DOMAIN}`). It's
  // server-built and only present when the cloud shared-inbox feature is
  // enabled, so we gate the dedicated email-address step on its availability.
  const sharedInboundAddress = useMemo(() => {
    return agentIntegrationLinks.find((link) => link.integration.providerId === EmailProviderIdEnum.NovuAgent)
      ?.integration.sharedInboundAddress;
  }, [agentIntegrationLinks]);

  // Managed agents have no bridge — the setup is considered complete as soon as the chosen
  // provider integration becomes connected. Fire onSetupComplete exactly once.
  const isManagedRuntime = agent.runtime === 'managed';

  // The brain section (connector + template) only renders in the onboarding flow above this
  // component. On the agent details page there is no brain section, so step numbering must
  // start at 1 here instead of continuing from 3.
  const isOnboarding = Boolean(connectSummary);
  const brainStepsBefore = isOnboarding ? BRAIN_STEPS : 0;
  const handlerStepsAfter = isManagedRuntime ? 0 : HANDLER_STEPS;
  // The email-address step is only counted when the cloud shared inbound
  // address is available — self-hosted (and any deployment without
  // `NOVU_AGENT_SHARED_INBOUND_DOMAIN`) keeps the original numbering.
  const showEmailInboundStep = Boolean(sharedInboundAddress);
  const emailInboundStepIndex = brainStepsBefore + 1;
  const channelStepIndex = brainStepsBefore + (showEmailInboundStep ? 2 : 1);
  const providerGuideStepOffset = channelStepIndex + 1;
  const bridgeStepOffset = providerGuideStepOffset + PROVIDER_GUIDE_RESERVED_STEPS;
  const totalSteps =
    brainStepsBefore + (showEmailInboundStep ? 2 : 1) + PROVIDER_GUIDE_RESERVED_STEPS + handlerStepsAfter;

  const firstIncompleteStep = hasProviderSelected ? providerGuideStepOffset : channelStepIndex;

  const ProviderGuide = selectedProviderId ? resolveProviderSetupGuide(selectedProviderId) : null;

  const integrationIdentifier = selectedIntegration?.identifier ?? defaultFromAgent?.identifier;
  const onSetupCompleteRef = useRef(onSetupComplete);
  onSetupCompleteRef.current = onSetupComplete;
  const setupCompleteFiredRef = useRef(false);
  const channelConnectedTrackedRef = useRef(false);
  const integrationGuideTrackedRef = useRef<string | null>(null);

  const trackWelcomeSent = useCallback(
    (providerId: string) => {
      if (!isOnboarding) return;

      telemetry(TelemetryEvent.ONBOARDING_WELCOME_SENT, {
        agentIdentifier: agent.identifier,
        providerId,
      });
    },
    [agent.identifier, isOnboarding, telemetry]
  );

  useEffect(() => {
    if (!isOnboarding || !hasConnectedIntegration || channelConnectedTrackedRef.current) return;

    const connectedLink = agentIntegrationsQuery.data?.data?.find(
      (link) => Boolean(link.connectedAt) && link.integration.providerId !== EmailProviderIdEnum.NovuAgent
    );
    if (!connectedLink) return;

    channelConnectedTrackedRef.current = true;
    onChannelConnected?.(connectedLink.integration.providerId);
    telemetry(TelemetryEvent.ONBOARDING_CHANNEL_CONNECTED, {
      agentIdentifier: agent.identifier,
      providerId: connectedLink.integration.providerId,
      integrationIdentifier: connectedLink.integration.identifier,
    });
  }, [
    agent.identifier,
    agentIntegrationsQuery.data?.data,
    hasConnectedIntegration,
    isOnboarding,
    onChannelConnected,
    telemetry,
  ]);

  useEffect(() => {
    if (!isOnboarding || !selectedProviderId || !effectiveIntegrationId) return;
    if (integrationGuideTrackedRef.current === effectiveIntegrationId) return;

    integrationGuideTrackedRef.current = effectiveIntegrationId;
    telemetry(TelemetryEvent.CONNECT_AGENT_INTEGRATION_GUIDE_VIEWED, {
      agentIdentifier: agent.identifier,
      providerId: selectedProviderId,
      integrationIdentifier: selectedIntegration?.identifier,
      isOnboarding: true,
    });
  }, [
    agent.identifier,
    effectiveIntegrationId,
    isOnboarding,
    selectedIntegration?.identifier,
    selectedProviderId,
    telemetry,
  ]);

  useEffect(() => {
    if (!isManagedRuntime) return;
    if (!hasConnectedIntegration) return;
    if (setupCompleteFiredRef.current) return;

    setupCompleteFiredRef.current = true;
    onSetupCompleteRef.current?.();
  }, [isManagedRuntime, hasConnectedIntegration]);

  const handleBridgeConnected = useCallback(() => {
    if (!setupCompleteFiredRef.current) {
      setupCompleteFiredRef.current = true;
      onSetupComplete?.();
    }

    const conversationId = onboardingConversationIdRef.current;
    if (
      !conversationId ||
      !currentEnvironment ||
      !integrationIdentifier ||
      lastSentConversationIdRef.current === conversationId
    ) {
      return;
    }

    lastSentConversationIdRef.current = conversationId;
    sendAgentWelcomeMessage(currentEnvironment, agent.identifier, integrationIdentifier, conversationId)
      .then(() => {
        if (selectedProviderId) {
          trackWelcomeSent(selectedProviderId);
        }

        setSearchParams((prev) => {
          prev.delete('onboardingConversationId');

          return prev;
        });
      })
      .catch(() => {
        if (lastSentConversationIdRef.current === conversationId) {
          lastSentConversationIdRef.current = null;
        }
      });
  }, [onSetupComplete, currentEnvironment, integrationIdentifier, agent.identifier, selectedProviderId, setSearchParams, trackWelcomeSent]);

  const handleProviderStepsCompleted = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: getAgentIntegrationsQueryKey(currentEnvironment?._id, agent.identifier),
    });
  }, [queryClient, currentEnvironment?._id, agent.identifier]);

  const handleAddProvider = useCallback(() => {
    if (!currentEnvironment?.slug) return;

    void navigate(
      `${buildRoute(agentRoutes.detailsTab, {
        environmentSlug: currentEnvironment.slug,
        agentIdentifier: encodeURIComponent(agent.identifier),
        agentTab: 'integrations',
      })}${location.search}`
    );
  }, [agent.identifier, agentRoutes.detailsTab, currentEnvironment?.slug, location.search, navigate]);

  return (
    <div className="relative flex flex-col gap-10 py-6 pb-3 pl-8 pr-3 md:pr-6">
      <div
        className="absolute bottom-0 left-[22px] top-0 w-px"
        style={{
          background: 'linear-gradient(to bottom, transparent 0%, #E1E4EA 10%, #E1E4EA 90%, transparent 100%)',
        }}
      />

      {connectSummary && (
        <div className="flex flex-col gap-10">
          <ViewAllInstructionsToggle
            expanded={isInstructionsExpanded}
            onToggle={() => setIsInstructionsExpanded((prev) => !prev)}
          />

          <motion.div
            initial={false}
            animate={{
              height: isInstructionsExpanded ? 'auto' : 0,
              opacity: isInstructionsExpanded ? 1 : 0,
              marginTop: isInstructionsExpanded ? 0 : '-40px',
            }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            style={{ clipPath: 'inset(0 -100% -100% -100%)' }}
          >
            <ConnectPhaseRecap summary={connectSummary} integrations={integrations} />
          </motion.div>
        </div>
      )}

      {showEmailInboundStep && sharedInboundAddress ? (
        <EmailInboundAddressStep
          index={emailInboundStepIndex}
          totalSteps={totalSteps}
          firstIncompleteStep={firstIncompleteStep}
          sharedInboundAddress={sharedInboundAddress}
        />
      ) : null}

      <SetupStep
        index={channelStepIndex}
        status={deriveStepStatus(channelStepIndex, firstIncompleteStep)}
        sectionLabel={showEmailInboundStep ? undefined : `${channelStepIndex}/${totalSteps} SETUP WHERE TO LISTEN`}
        title={
          showEmailInboundStep
            ? 'Add another channel for your agent to communicate'
            : 'Choose where your agent listens and communicates'
        }
        description="Start with one provider your agent can receive and respond on and you can always add more providers as you need."
        fullWidthContent={
          <ProviderCards
            agentIdentifier={agent.identifier}
            agentName={agent.name}
            selectedIntegrationId={validatedSelectedId ?? defaultFromAgent?.integrationId}
            existingLinks={agentIntegrationLinks}
            onSelect={(providerId, integration) => {
              if (isOnboarding) {
                telemetry(TelemetryEvent.ONBOARDING_CHANNEL_SELECTED, {
                  agentIdentifier: agent.identifier,
                  providerId,
                });
              }

              if (integration?._id) {
                setSelectedIntegrationId(integration._id);
                sessionStorage.setItem(SESSION_KEY(agent.identifier), integration._id);
              }
            }}
          />
        }
      />

      {/*
       * Expand the provider guide inline when the user picks a provider, and collapse it when
       * they switch to a different one (the `key` change triggers exit + enter). Same
       * height/opacity + clipPath pattern used for the connect↔details phase transition.
       */}
      <AnimatePresence mode="wait" initial={false}>
        {ProviderGuide && effectiveIntegrationId ? (
          <motion.div
            key={effectiveIntegrationId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="flex flex-col gap-10"
            style={{ clipPath: 'inset(0 -100% -100% -100%)' }}
          >
            <ProviderGuide
              agent={agent}
              integrationId={effectiveIntegrationId}
              stepOffset={providerGuideStepOffset}
              embedded={false}
              onStepsCompleted={handleProviderStepsCompleted}
              onWelcomeSent={isOnboarding && selectedProviderId ? () => trackWelcomeSent(selectedProviderId) : undefined}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {hasConnectedIntegration && !isManagedRuntime && (
        <AgentCodeSetupSection
          agent={agent}
          stepOffset={bridgeStepOffset}
          totalSteps={totalSteps}
          providerId={selectedProviderId}
          onBridgeConnected={handleBridgeConnected}
          onAddProvider={hideAddProvider ? undefined : handleAddProvider}
        />
      )}
    </div>
  );
}
