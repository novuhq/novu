import { FeatureFlagsKeysEnum, ProductUseCasesEnum } from '@novu/shared';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RiArrowLeftSLine, RiArrowRightSLine, RiExpandUpDownLine } from 'react-icons/ri';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import type { AgentResponse } from '@/api/agents';
import { AgentSetupSteps, ManagedAgentRecap } from '@/components/agents/agent-setup-steps';
import { CompletedStepIndicator } from '@/components/agents/setup-guide-primitives';
import { ConnectAgentStep, type ConnectSummary } from '@/components/onboarding/connect-agent/connect-agent-step';
import { getConnectorById } from '@/components/onboarding/connect-agent/connector-options';
import { PrebuiltPromptBanner } from '@/components/onboarding/connect-agent/prebuilt-prompt-banner';
import { OnboardingLoader } from '@/components/onboarding/onboarding-loader';
import { OnboardingShell } from '@/components/onboarding/onboarding-shell';
import { PageMeta } from '@/components/page-meta';
import { Button } from '@/components/primitives/button';
import { IS_EU } from '@/config';
import { useAuth } from '@/context/auth/hooks';
import { useEnvironment } from '@/context/environment/hooks';
import { useAgentRoutes } from '@/hooks/use-agent-routes';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useOnboardingProvisioningActive, useOnboardingProvisioningDismiss } from '@/hooks/use-onboarding-provisioning';
import { useTelemetry } from '@/hooks/use-telemetry';
import { useUpdateProductUseCases } from '@/hooks/use-update-product-use-cases';
import { AGENT_TEMPLATE_ID_PARAM, readActiveAgentTemplateId } from '@/utils/agent-template-identity';
import { isAbsoluteUrl } from '@/utils/apps';
import { clearPersistedCliOnboardingSessionId } from '@/utils/cli-onboarding-identity';
import { getPostOnboardingRoute, withOnboardingSource } from '@/utils/onboarding-redirect';
import { clearPendingProductType, readPendingProductType } from '@/utils/product-type-pending';
import { AGENT_DETAILS_DEFAULT_TAB, buildRoute, ROUTES } from '@/utils/routes';
import { TelemetryEvent } from '@/utils/telemetry';

function goToPostOnboardingRoute(target: string, navigate: (path: string) => void) {
  const targetWithSource = withOnboardingSource(target);

  // Absolute URLs need a full document load — that's what re-boots Clerk so it resyncs the freshly
  // created org. A client navigation would skip the reload and strand the next org-create at the
  // provisioning loader. The onboarding signal rides along as a query param, which survives it.
  if (isAbsoluteUrl(targetWithSource)) {
    window.location.assign(targetWithSource);

    return;
  }

  navigate(targetWithSource);
}

type LoadingPhase = 'initializing' | 'loading' | 'ready' | 'error';

type SkipBannerProps = {
  onSkip: () => void;
};

function SkipBanner({ onSkip }: SkipBannerProps) {
  return (
    <div className="border-stroke-soft bg-bg-weak my-4 flex items-center gap-3 rounded-lg border px-2 py-1.5">
      <div className="bg-text-soft h-[22px] w-1 shrink-0 rounded-full" />
      <p className="text-text-sub flex-1 text-xs font-medium leading-4">
        <span className="text-text-strong">Not the right time?</span> Skip for now and finish setup later.
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onSkip}
          className="border-stroke-soft text-text-sub inline-flex cursor-pointer items-center gap-0.5 rounded px-2 py-1 text-xs font-medium shadow-[0px_1px_3px_0px_rgba(14,18,27,0.12),0px_0px_0px_1px_#e1e4ea]"
          style={{
            backgroundImage:
              'linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.02) 100%), linear-gradient(90deg, #fff 0%, #fff 100%)',
          }}
        >
          Skip setup
          <RiArrowRightSLine className="size-4" />
        </button>
      </div>
    </div>
  );
}

/**
 * Collapsed marker for the completed agent-brain + channel-selection steps. Toggling it reveals or
 * hides the agent preview and channel cards while the channel setup guide stays visible.
 */
function ShowAllInstructionsToggle({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  return (
    <div className="relative flex items-center py-5 pl-8 pr-3 md:pr-6">
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
            {expanded ? 'Hide all instructions' : 'Show all instructions'}
          </span>
          <RiExpandUpDownLine className="size-4" />
        </button>
      </div>
    </div>
  );
}

type StepHeaderProps = {
  current: 1 | 2 | undefined;
  onBack?: () => void;
};

function StepHeader({ current, onBack }: StepHeaderProps) {
  return (
    <button
      type="button"
      onClick={onBack}
      disabled={!onBack}
      className="mb-5 flex cursor-pointer items-center gap-0.5 disabled:cursor-default"
    >
      <RiArrowLeftSLine className="text-text-sub size-4" />
      {typeof current === 'number' ? <span className="text-text-sub text-xs">{current}/2</span> : null}
    </button>
  );
}

export function AgentsSetupPage() {
  const isAgentsEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_CONVERSATIONAL_AGENTS_ENABLED, false);
  const isManagedEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_MANAGED_AGENT_RUNTIME_ENABLED, false);
  const navigate = useNavigate();
  const telemetry = useTelemetry();
  const { currentOrganization } = useAuth();
  const { currentEnvironment } = useEnvironment();
  const agentRoutes = useAgentRoutes();
  const updateProductUseCases = useUpdateProductUseCases();
  const productUseCasesPersistedRef = useRef(false);

  const [searchParams] = useSearchParams();
  const agentTemplateId = useMemo(
    () => readActiveAgentTemplateId(searchParams.get(AGENT_TEMPLATE_ID_PARAM)),
    [searchParams]
  );
  const pageTitle = 'Connect your agent to where your users are';

  // Org bootstrap (poll Novu envs + reload Clerk after org creation) lives in EnvironmentProvider.
  // Here we only gate on Novu's org id + the resolved environment, like the inbox onboarding page.
  const isDataReady = Boolean(currentOrganization?._id) && Boolean(currentEnvironment);
  const provisioningActive = useOnboardingProvisioningActive();

  useOnboardingProvisioningDismiss({
    isReady: isDataReady,
    fallbackVariant: 'agents',
  });

  useEffect(() => {
    telemetry(TelemetryEvent.AGENTS_SETUP_PAGE_VIEWED);
    telemetry(TelemetryEvent.ONBOARDING_PHASE_VIEWED, { phase: 'connect' });
  }, [telemetry]);

  // When the user arrives here via `?product_type=agents` (the usecase picker is skipped), persist the
  // agents usecase on the org once it's resolved. Runs once; the usecase picker path persists itself.
  // Skipped when agents are unavailable (EU/flag off) since the page redirects to the inbox path.
  useEffect(() => {
    if (productUseCasesPersistedRef.current || IS_EU || !isAgentsEnabled || !currentOrganization?._id) {
      return;
    }

    if (readPendingProductType() !== 'agents') {
      return;
    }

    productUseCasesPersistedRef.current = true;
    updateProductUseCases.mutate({ [ProductUseCasesEnum.AGENTS]: true });
    clearPendingProductType();
  }, [currentOrganization?._id, isAgentsEnabled, updateProductUseCases]);

  const [createdAgent, setCreatedAgent] = useState<AgentResponse | null>(null);
  const [connectSummary, setConnectSummary] = useState<ConnectSummary | null>(null);
  const [setupComplete, setSetupComplete] = useState(false);
  // True once the user picks a channel: the agent preview + channel cards collapse behind a
  // "Show all instructions" toggle so only the channel setup guide is shown.
  const [channelGuideActive, setChannelGuideActive] = useState(false);
  const [instructionsExpanded, setInstructionsExpanded] = useState(false);

  const [connectedProviderId, setConnectedProviderId] = useState<string | undefined>(undefined);

  const buildOnboardingCompletionProps = useCallback(() => {
    return {
      usecase: 'agents' as const,
      setupComplete,
      runtime: connectSummary ? (getConnectorById(connectSummary.connectorId)?.runtime ?? 'scratch') : undefined,
      connectorId: connectSummary?.connectorId,
      providerId: connectedProviderId,
      source: 'web' as const,
    };
  }, [connectSummary?.connectorId, connectedProviderId, setupComplete]);

  const handleAgentCreated = useCallback(
    (agent: AgentResponse, summary: ConnectSummary) => {
      // Stay on the connect view — the brain form just morphs into the agent preview in place.
      setCreatedAgent(agent);
      setConnectSummary(summary);
      telemetry(TelemetryEvent.ONBOARDING_PHASE_VIEWED, { phase: 'details', agentIdentifier: agent.identifier });
    },
    [telemetry]
  );

  const handleSkip = useCallback(() => {
    const completionProps = buildOnboardingCompletionProps();
    telemetry(TelemetryEvent.SKIP_ONBOARDING_CLICKED, {
      ...completionProps,
      skippedFrom: 'agents-setup',
    });
    telemetry(TelemetryEvent.ONBOARDING_REDIRECT, { from: 'skip' });
    clearPersistedCliOnboardingSessionId();

    if (currentEnvironment?.slug) {
      goToPostOnboardingRoute(getPostOnboardingRoute(currentEnvironment.slug), navigate);

      return;
    }

    void navigate(buildRoute(ROUTES.AGENTS, { environmentSlug: 'default' }));
  }, [buildOnboardingCompletionProps, currentEnvironment?.slug, navigate, telemetry]);

  const handleNavigateToOverview = useCallback(() => {
    telemetry(TelemetryEvent.ONBOARDING_COMPLETED, buildOnboardingCompletionProps());
    telemetry(TelemetryEvent.ONBOARDING_REDIRECT, { from: 'complete' });
    clearPersistedCliOnboardingSessionId();

    if (!currentEnvironment?.slug) return;

    if (createdAgent) {
      const agentPath = buildRoute(agentRoutes.detailsTab, {
        environmentSlug: currentEnvironment.slug,
        agentIdentifier: encodeURIComponent(createdAgent.identifier),
        agentTab: AGENT_DETAILS_DEFAULT_TAB,
      });
      goToPostOnboardingRoute(agentPath, navigate);
    } else {
      goToPostOnboardingRoute(getPostOnboardingRoute(currentEnvironment.slug), navigate);
    }
  }, [
    agentRoutes.detailsTab,
    buildOnboardingCompletionProps,
    createdAgent,
    currentEnvironment?.slug,
    navigate,
    telemetry,
  ]);

  const handleSetupAnotherChannel = useCallback(() => {
    if (!currentEnvironment?.slug || !createdAgent) return;

    void navigate(
      buildRoute(agentRoutes.detailsTab, {
        environmentSlug: currentEnvironment.slug,
        agentIdentifier: encodeURIComponent(createdAgent.identifier),
        agentTab: 'integrations',
      })
    );
  }, [agentRoutes.detailsTab, createdAgent, currentEnvironment?.slug, navigate]);

  const handleBackStep = useCallback(() => {
    void navigate(ROUTES.USECASE_SELECT);
  }, [navigate]);

  // Agents are not available in the EU region.
  if (IS_EU || !isAgentsEnabled) {
    return <Navigate to={ROUTES.INBOX_USECASE} replace />;
  }

  if (provisioningActive) {
    return null;
  }

  if (!isDataReady) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <PageMeta title="Build and distribute agents" />
        <OnboardingLoader variant="agents" />
      </div>
    );
  }

  // Collapse the agent preview + channel cards once a channel guide is active, unless the user
  // expands "Show all instructions".
  const collapsePreview = channelGuideActive && !instructionsExpanded;

  const leftContent = (
    <>
      <PageMeta title={pageTitle} />
      <StepHeader current={2} onBack={handleBackStep} />

      <h1 className="text-foreground text-lg font-medium tracking-[-0.27px]">{pageTitle}</h1>
      <p className="text-text-soft mt-1 text-xs font-normal leading-4 w-1/2">
        Choose a starting point to see how your agent handles your users’ conversations. You can replace it with your
        own agent and credentials later.
      </p>

      {/* Pre-built prompt tip: only relevant while the user is authoring the agent brain. It
       * collapses away once the agent is created and the page morphs into the agent preview. */}
      <AnimatePresence initial={false}>
        {!createdAgent ? (
          <motion.div
            key="prebuilt-prompt-banner"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="mt-6">
              <PrebuiltPromptBanner />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/*
       * The user stays on one screen. Step 1 crossfades the brain form into the created-agent
       * preview card; step 2 (channels) crossfades from the dimmed/disabled preview into the live,
       * interactive channel step in place. Keyed on `createdAgent` — the back arrow returns to the
       * brain form.
       */}
      <div className="relative mt-8">
        {/* Single continuous rail line behind every step segment. Each segment also draws its own
         * gradient line, but those fade to transparent at their edges and pinch where segments meet;
         * this same-colored line sits underneath and fills those gaps so the toggle, brain step, and
         * channel steps read as one unbroken vertical timeline. */}
        <div
          className="absolute bottom-0 left-[22px] top-0 w-px"
          style={{
            background:
              'linear-gradient(to bottom, transparent 0, #E1E4EA 24px, #E1E4EA calc(100% - 24px), transparent 100%)',
          }}
        />

        {/* Once a channel is picked, the completed agent-brain + channel-selection steps collapse
         * behind this toggle so only the channel setup guide remains visible. It animates in
         * (height + opacity) in sync with the collapsing preview so the whole transition is one beat. */}
        <AnimatePresence initial={false}>
          {createdAgent && channelGuideActive ? (
            <motion.div
              key="show-all-instructions"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              style={{ clipPath: 'inset(0 -100% -100% -100%)', overflow: 'hidden' }}
            >
              <ShowAllInstructionsToggle
                expanded={instructionsExpanded}
                onToggle={() => setInstructionsExpanded((prev) => !prev)}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/*
         * Step 1: the brain form crossfades into the created-agent preview card, overlapping in the
         * same grid cell so the swap reads as an in-place morph. Collapses to height 0 once a
         * channel guide is active (unless the user expands "Show all instructions").
         */}
        <motion.div
          initial={false}
          animate={{
            height: collapsePreview ? 0 : 'auto',
            opacity: collapsePreview ? 0 : 1,
          }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          style={{ clipPath: 'inset(0 -100% -100% -100%)', overflow: 'hidden' }}
        >
          {/* The brain form unmounts instantly when the agent is created (no overlap → no ghosting)
           * and the preview fades/rises in. There's no crossfade or animated height, so the section
           * height changes exactly once — the scrollbar can't flick on/off mid-transition. */}
          {createdAgent && connectSummary ? (
            <motion.div
              key="agent-preview"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="relative py-6 pl-8 pr-3 md:pr-6">
                <div
                  className="absolute bottom-0 left-[22px] top-0 w-px"
                  style={{
                    background:
                      'linear-gradient(to bottom, transparent 0%, #E1E4EA 10%, #E1E4EA 90%, transparent 100%)',
                  }}
                />
                <ManagedAgentRecap agent={createdAgent} summary={connectSummary} hideHeader />
              </div>
            </motion.div>
          ) : (
            <div className="relative pb-12">
              <ConnectAgentStep
                onAgentCreated={handleAgentCreated}
                isManagedEnabled={isManagedEnabled}
                agentTemplateId={agentTemplateId}
                simplifiedDemo
              />
            </div>
          )}
        </motion.div>

        {/*
         * Step 2: the channel section becomes interactive once the agent exists. When the user picks
         * a channel its setup guide replaces the cards in place (the cards collapse via
         * `collapseChannelSelection`).
         */}
        {createdAgent ? (
          <AgentSetupSteps
            agent={createdAgent}
            onSetupComplete={() => setSetupComplete(true)}
            onChannelConnected={(providerId) => setConnectedProviderId(providerId)}
            hideAddProvider
            hideRecap
            collapseChannelSelection={collapsePreview}
            onChannelGuideActiveChange={setChannelGuideActive}
            connectSummary={connectSummary}
          />
        ) : null}
      </div>

      {/* Footer actions live outside the rail so the continuous line ends at the last step. */}
      {createdAgent && setupComplete ? (
        <div className="mt-6 flex items-center gap-3 pb-10 pl-6">
          <Button
            className="text-label-xs gap-1 rounded-lg p-2"
            variant="primary"
            size="xs"
            onClick={handleNavigateToOverview}
          >
            Navigate to Dashboard
            <RiArrowRightSLine className="size-4" />
          </Button>
          <button
            type="button"
            onClick={handleSetupAnotherChannel}
            className="text-text-sub hover:text-text-strong text-label-xs cursor-pointer font-medium"
          >
            Setup another channel
          </button>
        </div>
      ) : (
        <SkipBanner onSkip={handleSkip} />
      )}
    </>
  );

  return <OnboardingShell left={leftContent} maxLeftWidth="864px" alignLeft="top" />;
}
