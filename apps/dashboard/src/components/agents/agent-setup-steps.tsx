import { AgentRuntimeProviderIdEnum, EmailProviderIdEnum, type IIntegration } from '@novu/shared';
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
import { AgentCard, type AgentCardConnectorKind } from '@/components/onboarding/claude-agent-preview-illustration';
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
import { AgentListenStep } from './agent-listen-step';
import { isChannelReadyForBridge } from './is-channel-ready-for-bridge';
import { ProviderCards } from './provider-cards';
import { resolveProviderSetupGuide, shouldShowProviderSetupGuide } from './provider-setup-guide';
import { CompletedStepIndicator, SetupStep } from './setup-guide-primitives';
import { deriveStepStatus } from './setup-guide-step-utils';

const noop = () => {};

const SESSION_KEY = (agentIdentifier: string) => `agent-setup-integration:${agentIdentifier}`;
const EMAIL_WELCOME_SESSION_KEY = (agentIdentifier: string) => `agent-email-welcome:${agentIdentifier}`;

// The brain section is a single step in the onboarding flow — the created agent is shown as a
// recap card (step 1) above this component's channel step.
const BRAIN_STEPS = 1;
// Provider guides reserve up to three numbered steps; the bridge section continues from there.
const PROVIDER_GUIDE_RESERVED_STEPS = 3;
// Self-hosted agents add three handler steps (scaffold + run + send) below the provider guide.
const HANDLER_STEPS = 3;

/**
 * Channel-level integration snapshot the parent uses to drive the right-side illustration.
 * `selectedProviderId` is the chat provider the user picked from the provider cards (or the
 * agent's default integration); `connectedProviderIds` carries every provider whose link is
 * actively connected, so the preview can flip the matching channel card to CONNECTED.
 */
export type AgentChannelState = {
  selectedProviderId: string | undefined;
  connectedProviderIds: ReadonlyArray<string>;
};

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
  /**
   * Onboarding flow only: notifies the parent whenever the picked provider or the set of
   * actually-connected providers changes, so the illustration can highlight the right card.
   */
  onChannelStateChange?: (state: AgentChannelState) => void;
  /**
   * When true, the agent recap (step 1) is not rendered here — the parent owns it (e.g. the
   * onboarding page crossfades the brain form into the recap card). Step numbering is preserved.
   */
  hideRecap?: boolean;
  /**
   * When true, the channel-selection step (the provider cards) is hidden so only the active
   * provider setup guide shows. The parent collapses the agent preview alongside it.
   */
  collapseChannelSelection?: boolean;
  /**
   * Fires whenever an explicitly-picked channel's setup guide becomes active/inactive, so the
   * parent can collapse the preview + channel cards behind a "Show all instructions" toggle.
   */
  onChannelGuideActiveChange?: (active: boolean) => void;
};

function ViewAllInstructionsToggle({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  return (
    <div className="relative flex items-center pl-6">
      <div className="absolute -left-[20px] flex w-5 justify-center">
        <CompletedStepIndicator />
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

/**
 * Onboarding-only recap: the just-created managed agent rendered as the checked step-1 card
 * (reuses the `AgentCard` from the preview illustration). Server-projected MCPs/tools/system
 * prompt are authoritative; the connect-phase `summary` is the fallback when the API omitted the
 * managed-runtime view.
 */
// Mirror of the connect-agent brain step copy, so the title/subtitle stay identical before and
// after the form morphs into the agent preview card.
const BRAIN_STEP_TITLE = 'What should your agent do?';
const BRAIN_STEP_DESCRIPTION =
  "We'll provide demo Claude credentials so you can set up an agent without bringing your own keys. Later, you can replace it with your own agent and credentials.";

export function ManagedAgentRecap({
  agent,
  summary,
  hideHeader,
}: {
  agent: AgentResponse;
  summary: ConnectSummary;
  /**
   * When true, the step title/description are omitted and only the agent preview card is rendered
   * next to the completed-step indicator (onboarding "Agent preview" step).
   */
  hideHeader?: boolean;
}) {
  const isManagedAgent = agent.runtime === 'managed';
  const managedConnector: AgentCardConnectorKind =
    agent.managedRuntime?.providerId === AgentRuntimeProviderIdEnum.AnthropicAws ? 'aws' : 'anthropic';
  // Custom-code (self-hosted) agents render the trimmed card variant: custom-code icon + footer,
  // no status badge, and no MCPs/tools/instructions (those live in the user's own code).
  const connector: AgentCardConnectorKind = isManagedAgent ? managedConnector : 'custom';
  const serverMcpIds = agent.managedRuntime?.mcpServers?.map((m) => m.externalId);
  const serverToolIds = agent.managedRuntime?.tools?.map((t) => t.externalId);

  const agentCard = (
    <AgentCard
      connector={connector}
      isDemoCredential={agent.managedRuntime?.providerId === AgentRuntimeProviderIdEnum.NovuAnthropic}
      status="connected"
      agentCreated
      displayName={agent.name}
      isPlaceholderName={false}
      description={agent.description}
      identifier={agent.identifier}
      instructions={agent.managedRuntime?.systemPrompt ?? summary.instructions}
      mcpServers={serverMcpIds ?? summary.mcpServers ?? []}
      tools={serverToolIds ?? summary.tools ?? []}
    />
  );

  if (hideHeader) {
    return (
      <div className="relative flex flex-col pl-6">
        <div className="absolute -left-[20px] top-[3px] flex w-5 justify-center">
          <CompletedStepIndicator />
        </div>
        {agentCard}
      </div>
    );
  }

  return (
    <SetupStep
      index={1}
      status="completed"
      title={BRAIN_STEP_TITLE}
      description={BRAIN_STEP_DESCRIPTION}
      fullWidthContent={agentCard}
    />
  );
}

export function AgentSetupSteps({
  agent,
  onSetupComplete,
  hideAddProvider,
  connectSummary,
  onChannelConnected,
  onChannelStateChange,
  hideRecap,
  collapseChannelSelection,
  onChannelGuideActiveChange,
}: AgentSetupStepsProps) {
  const { currentEnvironment } = useEnvironment();
  const { integrations } = useFetchIntegrations();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const agentRoutes = useAgentRoutes();
  const [searchParams, setSearchParams] = useSearchParams();
  const telemetry = useTelemetry();
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

  const selectedIntegration = useMemo(() => {
    if (validatedSelectedId) {
      return integrations?.find((i) => i._id === validatedSelectedId);
    }

    return undefined;
  }, [integrations, validatedSelectedId]);

  const agentIntegrationLinks = useMemo(
    () => agentIntegrationsQuery.data?.data ?? [],
    [agentIntegrationsQuery.data?.data]
  );

  const sharedInboundAddress = useMemo(() => {
    return agentIntegrationLinks.find((link) => link.integration.providerId === EmailProviderIdEnum.NovuAgent)
      ?.integration.sharedInboundAddress;
  }, [agentIntegrationLinks]);

  // Managed agents have no bridge — the setup is considered complete as soon as the chosen
  // provider integration becomes connected. Fire onSetupComplete exactly once.
  const isManagedRuntime = agent.runtime === 'managed';

  const useCloudMergedListenStep = Boolean(sharedInboundAddress) && !isManagedRuntime;

  // The brain section (connector + template) only renders in the onboarding flow above this
  // component. On the agent details page there is no brain section, so step numbering must
  // start at 1 here instead of continuing from 3.
  const isOnboarding = Boolean(connectSummary);
  const brainStepsBefore = isOnboarding ? BRAIN_STEPS : 0;
  const handlerStepsAfter = isManagedRuntime ? 0 : HANDLER_STEPS;

  const legacyDefaultFromAgent = useCloudMergedListenStep ? undefined : agent.integrations?.[0];
  const selectedProviderId = selectedIntegration?.providerId ?? legacyDefaultFromAgent?.providerId;
  const isEmailChannelSelected = selectedProviderId === EmailProviderIdEnum.NovuAgent;
  const effectiveIntegrationId = validatedSelectedId ?? legacyDefaultFromAgent?.integrationId;

  // Email is surfaced as a provider card inside the listen step, so it never gets its own numbered
  // step — the channel cards are always the first step after the brain section.
  const channelStepIndex = brainStepsBefore + 1;
  const providerGuideStepOffset = channelStepIndex + 1;

  const channelReadyForBridge = isChannelReadyForBridge({
    selectedProviderId,
    selectedIntegrationId: validatedSelectedId,
    agentIntegrationLinks,
    useCloudMergedListenStep,
  });

  const skipProviderGuide = useCloudMergedListenStep && isEmailChannelSelected && channelReadyForBridge;

  const providerGuideSteps = skipProviderGuide ? 0 : PROVIDER_GUIDE_RESERVED_STEPS;
  const bridgeStepOffset = providerGuideStepOffset + providerGuideSteps;

  const totalSteps = brainStepsBefore + 1 + providerGuideSteps + handlerStepsAfter;

  useEffect(() => {
    if (useCloudMergedListenStep) return;

    if (legacyDefaultFromAgent?.integrationId) {
      sessionStorage.removeItem(SESSION_KEY(agent.identifier));
    }
  }, [legacyDefaultFromAgent?.integrationId, agent.identifier, useCloudMergedListenStep]);

  const firstIncompleteStep = useMemo(() => {
    if (!effectiveIntegrationId) {
      return channelStepIndex;
    }

    if (channelReadyForBridge) {
      return bridgeStepOffset;
    }

    return providerGuideStepOffset;
  }, [effectiveIntegrationId, channelReadyForBridge, bridgeStepOffset, providerGuideStepOffset, channelStepIndex]);

  // In onboarding the setup guide (and the collapse it triggers) only appears once the user
  // explicitly picks a channel — not for the auto-provisioned default. On the agent details page
  // the guide keeps following the agent's default/selected integration.
  const guideIntegrationId = isOnboarding ? validatedSelectedId : effectiveIntegrationId;
  const guideProviderId = isOnboarding ? selectedIntegration?.providerId : selectedProviderId;
  const ProviderGuide = guideProviderId ? resolveProviderSetupGuide(guideProviderId) : null;
  const isChannelGuideActive = Boolean(ProviderGuide && guideIntegrationId && !skipProviderGuide);

  // The agent–integration link carries the server-computed shared inbound address (e.g. the demo
  // email's default `…@agentconnect.sh` inbox). The email guide needs it to surface that address.
  const guideIntegrationLink = useMemo(
    () => agentIntegrationLinks.find((link) => link.integration._id === guideIntegrationId),
    [agentIntegrationLinks, guideIntegrationId]
  );

  const onChannelGuideActiveChangeRef = useRef(onChannelGuideActiveChange);
  onChannelGuideActiveChangeRef.current = onChannelGuideActiveChange;
  useEffect(() => {
    onChannelGuideActiveChangeRef.current?.(isChannelGuideActive);
  }, [isChannelGuideActive]);
  const integrationIdentifier = selectedIntegration?.identifier ?? legacyDefaultFromAgent?.identifier;

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

  const requestEmailWelcome = useCallback(
    (integrationIdentifierOverride?: string) => {
      const targetIntegrationIdentifier = integrationIdentifierOverride ?? integrationIdentifier;

      if (!currentEnvironment || !targetIntegrationIdentifier) {
        return;
      }

      const storageKey = EMAIL_WELCOME_SESSION_KEY(agent.identifier);
      if (sessionStorage.getItem(storageKey)) {
        return;
      }

      sessionStorage.setItem(storageKey, '1');

      sendAgentWelcomeMessage(currentEnvironment, agent.identifier, targetIntegrationIdentifier)
        .then(() => {
          trackWelcomeSent(EmailProviderIdEnum.NovuAgent);
        })
        .catch(() => {
          sessionStorage.removeItem(storageKey);
        });
    },
    [agent.identifier, currentEnvironment, integrationIdentifier, trackWelcomeSent]
  );

  useEffect(() => {
    if (
      !isOnboarding ||
      !skipProviderGuide ||
      !channelReadyForBridge ||
      !isEmailChannelSelected ||
      !currentEnvironment ||
      !integrationIdentifier
    ) {
      return;
    }

    requestEmailWelcome();
  }, [
    channelReadyForBridge,
    currentEnvironment,
    integrationIdentifier,
    isEmailChannelSelected,
    isOnboarding,
    requestEmailWelcome,
    skipProviderGuide,
  ]);

  const handleProviderSelect = useCallback(
    (providerId: string, integration?: IIntegration) => {
      if (isOnboarding) {
        telemetry(TelemetryEvent.ONBOARDING_CHANNEL_SELECTED, {
          agentIdentifier: agent.identifier,
          providerId,
        });
      }

      if (integration?._id) {
        setSelectedIntegrationId(integration._id);
        sessionStorage.setItem(SESSION_KEY(agent.identifier), integration._id);

        if (isOnboarding && shouldShowProviderSetupGuide({ providerId, isOnboarding, useCloudMergedListenStep })) {
          onChannelGuideActiveChangeRef.current?.(true);
        }
      }

      if (isOnboarding && providerId === EmailProviderIdEnum.NovuAgent && integration?.identifier) {
        requestEmailWelcome(integration.identifier);
      }
    },
    [agent.identifier, isOnboarding, requestEmailWelcome, telemetry, useCloudMergedListenStep]
  );

  useEffect(() => {
    if (!isOnboarding || channelConnectedTrackedRef.current) return;

    if (useCloudMergedListenStep && channelReadyForBridge && isEmailChannelSelected) {
      channelConnectedTrackedRef.current = true;
      onChannelConnected?.(EmailProviderIdEnum.NovuAgent);
      telemetry(TelemetryEvent.ONBOARDING_CHANNEL_CONNECTED, {
        agentIdentifier: agent.identifier,
        providerId: EmailProviderIdEnum.NovuAgent,
        integrationIdentifier: selectedIntegration?.identifier,
      });

      return;
    }

    if (!hasConnectedIntegration) return;

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
    channelReadyForBridge,
    hasConnectedIntegration,
    isOnboarding,
    onChannelConnected,
    selectedIntegration?.identifier,
    isEmailChannelSelected,
    telemetry,
    useCloudMergedListenStep,
  ]);

  useEffect(() => {
    if (!isOnboarding || !selectedProviderId || !effectiveIntegrationId || skipProviderGuide) return;
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
    skipProviderGuide,
    telemetry,
  ]);

  useEffect(() => {
    if (!isManagedRuntime) return;
    if (!hasConnectedIntegration) return;
    if (setupCompleteFiredRef.current) return;

    setupCompleteFiredRef.current = true;
    onSetupCompleteRef.current?.();
  }, [isManagedRuntime, hasConnectedIntegration]);

  const connectedProviderIds = useMemo<ReadonlyArray<string>>(() => {
    return agentIntegrationLinks
      .filter((link) => Boolean(link.connectedAt) && link.integration.providerId !== EmailProviderIdEnum.NovuAgent)
      .map((link) => link.integration.providerId);
  }, [agentIntegrationLinks]);

  const onChannelStateChangeRef = useRef(onChannelStateChange);
  onChannelStateChangeRef.current = onChannelStateChange;
  useEffect(() => {
    onChannelStateChangeRef.current?.({
      selectedProviderId,
      connectedProviderIds,
    });
  }, [selectedProviderId, connectedProviderIds]);

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
  }, [
    onSetupComplete,
    currentEnvironment,
    integrationIdentifier,
    agent.identifier,
    selectedProviderId,
    setSearchParams,
    trackWelcomeSent,
  ]);

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

      {connectSummary &&
        !hideRecap &&
        (isManagedRuntime ? (
          <ManagedAgentRecap agent={agent} summary={connectSummary} />
        ) : (
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
        ))}

      {/*
       * Keep the channel-selection step mounted and collapse it via height/opacity so it animates
       * away in sync with the agent preview (page) and the expanding provider guide. The negative
       * margin absorbs the parent's `gap-10` while collapsed so the rail doesn't keep a 40px gap.
       */}
      <motion.div
        initial={false}
        animate={{
          height: collapseChannelSelection ? 0 : 'auto',
          opacity: collapseChannelSelection ? 0 : 1,
          marginBottom: collapseChannelSelection ? '-40px' : 0,
        }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        style={{ clipPath: 'inset(0 -100% -100% -100%)' }}
      >
        {useCloudMergedListenStep && sharedInboundAddress ? (
          <AgentListenStep
            index={channelStepIndex}
            totalSteps={totalSteps}
            firstIncompleteStep={firstIncompleteStep}
            agentIdentifier={agent.identifier}
            agentName={agent.name}
            selectedIntegrationId={effectiveIntegrationId}
            existingLinks={agentIntegrationLinks}
            onSelect={handleProviderSelect}
          />
        ) : (
          <SetupStep
            index={channelStepIndex}
            status={deriveStepStatus(channelStepIndex, firstIncompleteStep)}
            title="Choose where your agent can talk"
            description="Connect a channel so users can message the agent and receive replies."
            fullWidthContent={
              <ProviderCards
                agentIdentifier={agent.identifier}
                agentName={agent.name}
                selectedIntegrationId={effectiveIntegrationId}
                existingLinks={agentIntegrationLinks}
                onSelect={handleProviderSelect}
              />
            }
          />
        )}
      </motion.div>

      <AnimatePresence mode="wait" initial={false}>
        {ProviderGuide && guideIntegrationId && !skipProviderGuide ? (
          <motion.div
            key={guideIntegrationId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="flex flex-col gap-10"
            style={{ clipPath: 'inset(0 -100% -100% -100%)' }}
          >
            <ProviderGuide
              agent={agent}
              integrationId={guideIntegrationId}
              stepOffset={providerGuideStepOffset}
              embedded={false}
              isOnboarding={isOnboarding}
              onStepsCompleted={handleProviderStepsCompleted}
              onWelcomeSent={
                isOnboarding && guideProviderId && guideProviderId !== EmailProviderIdEnum.NovuAgent
                  ? () => trackWelcomeSent(guideProviderId)
                  : undefined
              }
              integrationLink={guideIntegrationLink}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {channelReadyForBridge && !isManagedRuntime && (
        <AgentCodeSetupSection
          agent={agent}
          stepOffset={bridgeStepOffset}
          totalSteps={totalSteps}
          providerId={selectedProviderId}
          sharedInboundAddress={isEmailChannelSelected ? sharedInboundAddress : undefined}
          onBridgeConnected={handleBridgeConnected}
          onAddProvider={hideAddProvider ? undefined : handleAddProvider}
        />
      )}
    </div>
  );
}
