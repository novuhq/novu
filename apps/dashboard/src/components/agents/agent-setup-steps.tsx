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
import { AgentListenStep } from './agent-listen-step';
import { EmailInboundAddressStep } from './email-inbound-address-step';
import { EmailSetupGuide } from './email-setup-guide';
import { isChannelReadyForBridge } from './is-channel-ready-for-bridge';
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

  const agentIntegrationLinks = useMemo(
    () => agentIntegrationsQuery.data?.data ?? [],
    [agentIntegrationsQuery.data?.data]
  );

  const sharedInboundAddress = useMemo(() => {
    return agentIntegrationLinks.find((link) => link.integration.providerId === EmailProviderIdEnum.NovuAgent)
      ?.integration.sharedInboundAddress;
  }, [agentIntegrationLinks]);

  const isManagedRuntime = agent.runtime === 'managed';
  const useCloudMergedListenStep = Boolean(sharedInboundAddress) && !isManagedRuntime;
  const legacyDefaultFromAgent = useCloudMergedListenStep ? undefined : agent.integrations?.[0];
  const effectiveIntegrationId = validatedSelectedId ?? legacyDefaultFromAgent?.integrationId;

  useEffect(() => {
    if (useCloudMergedListenStep) return;

    if (legacyDefaultFromAgent?.integrationId) {
      sessionStorage.removeItem(SESSION_KEY(agent.identifier));
    }
  }, [legacyDefaultFromAgent?.integrationId, agent.identifier, useCloudMergedListenStep]);

  const selectedIntegration = useMemo(() => {
    if (validatedSelectedId) {
      return integrations?.find((i) => i._id === validatedSelectedId);
    }

    return undefined;
  }, [integrations, validatedSelectedId]);

  const selectedProviderId =
    selectedIntegration?.providerId ?? legacyDefaultFromAgent?.providerId;

  const isEmailChannelSelected = selectedProviderId === EmailProviderIdEnum.NovuAgent;
  const isOnboarding = Boolean(connectSummary);
  const brainStepsBefore = isOnboarding ? BRAIN_STEPS : 0;
  const handlerStepsAfter = isManagedRuntime ? 0 : HANDLER_STEPS;

  const showLegacyEmailInboundStep = !useCloudMergedListenStep && Boolean(sharedInboundAddress);
  const listenStepIndex = brainStepsBefore + 1;
  const legacyChannelStepIndex = brainStepsBefore + (showLegacyEmailInboundStep ? 2 : 1);
  const channelStepIndex = useCloudMergedListenStep ? listenStepIndex : legacyChannelStepIndex;
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

  const listenSteps = useCloudMergedListenStep ? 1 : showLegacyEmailInboundStep ? 2 : 1;
  const totalSteps = brainStepsBefore + listenSteps + providerGuideSteps + handlerStepsAfter;

  const firstIncompleteStep = useMemo(() => {
    if (!effectiveIntegrationId) {
      return channelStepIndex;
    }

    if (channelReadyForBridge) {
      return bridgeStepOffset;
    }

    return providerGuideStepOffset;
  }, [effectiveIntegrationId, channelReadyForBridge, bridgeStepOffset, providerGuideStepOffset, channelStepIndex]);

  const ProviderGuide = selectedProviderId ? resolveProviderSetupGuide(selectedProviderId) : null;
  const showProviderGuide = Boolean(ProviderGuide && effectiveIntegrationId && !skipProviderGuide);

  const integrationIdentifier =
    selectedIntegration?.identifier ?? legacyDefaultFromAgent?.identifier;

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
      }
    },
    [agent.identifier, isOnboarding, telemetry]
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

      {useCloudMergedListenStep && sharedInboundAddress ? (
        <AgentListenStep
          index={listenStepIndex}
          totalSteps={totalSteps}
          firstIncompleteStep={firstIncompleteStep}
          sharedInboundAddress={sharedInboundAddress}
          agentIdentifier={agent.identifier}
          agentName={agent.name}
          selectedIntegrationId={effectiveIntegrationId}
          selectedProviderId={selectedProviderId}
          existingLinks={agentIntegrationLinks}
          onSelect={handleProviderSelect}
        />
      ) : (
        <>
          {showLegacyEmailInboundStep && sharedInboundAddress ? (
            <EmailInboundAddressStep
              index={listenStepIndex}
              totalSteps={totalSteps}
              firstIncompleteStep={firstIncompleteStep}
              sharedInboundAddress={sharedInboundAddress}
            />
          ) : null}

          <SetupStep
            index={channelStepIndex}
            status={deriveStepStatus(channelStepIndex, firstIncompleteStep)}
            sectionLabel={
              showLegacyEmailInboundStep ? undefined : `${channelStepIndex}/${totalSteps} SETUP WHERE TO LISTEN`
            }
            title={
              showLegacyEmailInboundStep
                ? 'Add another channel for your agent to communicate'
                : 'Choose where your agent listens and communicates'
            }
            description="Start with one provider your agent can receive and respond on and you can always add more providers as you need."
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
        </>
      )}

      <AnimatePresence mode="wait" initial={false}>
        {showProviderGuide && ProviderGuide && effectiveIntegrationId ? (
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
              onWelcomeSent={
                isOnboarding && selectedProviderId ? () => trackWelcomeSent(selectedProviderId) : undefined
              }
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
