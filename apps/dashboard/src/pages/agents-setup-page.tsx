import { useOrganization, useUser } from '@clerk/clerk-react';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RiArrowLeftSLine, RiArrowRightSLine, RiCalendarEventLine } from 'react-icons/ri';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import type { AgentResponse } from '@/api/agents';
import { AgentSetupSteps } from '@/components/agents/agent-setup-steps';
import type { RuntimeType } from '@/components/agents/create-agent-fields';
import { BOOK_DEMO_URL } from '@/components/header-navigation/support-drawer-constants';
import {
  AgentFlowIllustration,
  type AgentFlowRuntime,
  type AgentFlowState,
} from '@/components/onboarding/agent-flow-illustration';
import { ConnectAgentStep, type ConnectSummary } from '@/components/onboarding/connect-agent/connect-agent-step';
import { OnboardingLoader } from '@/components/onboarding/onboarding-loader';
import { OnboardingShell } from '@/components/onboarding/onboarding-shell';
import { PageMeta } from '@/components/page-meta';
import { Button } from '@/components/primitives/button';
import { useAuth } from '@/context/auth/hooks';
import { useEnvironment, useFetchEnvironments } from '@/context/environment/hooks';
import { useAgentRoutes } from '@/hooks/use-agent-routes';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useTelemetry } from '@/hooks/use-telemetry';
import { getOnboardingAppId, getPostOnboardingRoute, withAppId } from '@/utils/onboarding-redirect';
import { buildRoute, ROUTES } from '@/utils/routes';
import { TelemetryEvent } from '@/utils/telemetry';

type LoadingPhase = 'initializing' | 'loading' | 'ready' | 'error';
type SetupPhase = 'connect' | 'details';

function getIllustrationState({ phase, setupComplete }: { phase: SetupPhase; setupComplete: boolean }): AgentFlowState {
  if (setupComplete) {
    return 'connected';
  }

  if (phase === 'details') {
    return 'details';
  }

  return 'connect';
}

function toIllustrationRuntime(runtime: RuntimeType): AgentFlowRuntime {
  return runtime === 'claude' ? 'claude' : 'scratch';
}

function resolveCreatedAgentRuntime(agent: AgentResponse): AgentFlowRuntime {
  return agent.runtime === 'managed' ? 'claude' : 'scratch';
}

function useAgentEnvLoading(organizationId?: string) {
  const [phase, setPhase] = useState<LoadingPhase>('initializing');
  const { refetchEnvironments } = useFetchEnvironments({ organizationId });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const initializeAndFetch = useCallback(async () => {
    if (!organizationId) return;

    try {
      setPhase('initializing');
      await new Promise((resolve) => setTimeout(resolve, 100));
      setPhase('loading');
      await refetchEnvironments();
      setPhase('ready');
    } catch (error) {
      console.warn('Failed to load environment:', error);
      setPhase('error');
    }
  }, [organizationId, refetchEnvironments]);

  useEffect(() => {
    if (organizationId) {
      timeoutRef.current = setTimeout(() => {
        void initializeAndFetch();
      }, 50);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [organizationId, initializeAndFetch]);

  return phase;
}

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
        <a
          href={BOOK_DEMO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="border-stroke-soft text-text-sub inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium shadow-[0px_1px_3px_0px_rgba(14,18,27,0.12),0px_0px_0px_1px_#e1e4ea]"
          style={{
            backgroundImage:
              'linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.02) 100%), linear-gradient(90deg, #fff 0%, #fff 100%)',
          }}
        >
          <RiCalendarEventLine className="size-4" />
          Book a demo
        </a>
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

type StepHeaderProps = {
  current: 2 | 3;
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
      <span className="text-text-sub text-xs">{current}/3</span>
    </button>
  );
}

export function AgentsSetupPage() {
  const isAgentsEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_CONVERSATIONAL_AGENTS_ENABLED, false);
  const isManagedEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_MANAGED_AGENT_RUNTIME_ENABLED, false);
  const navigate = useNavigate();
  const { user } = useUser();
  const { organization } = useOrganization();
  const telemetry = useTelemetry();
  const { currentOrganization } = useAuth();
  const { currentEnvironment } = useEnvironment();
  const agentRoutes = useAgentRoutes();

  const [searchParams] = useSearchParams();
  const appId = useMemo(() => getOnboardingAppId(searchParams), [searchParams]);

  const [envLoaded, setEnvLoaded] = useState(false);
  const { environments } = useFetchEnvironments({
    organizationId: !envLoaded ? 'org' : '',
    refetchInterval: !envLoaded ? 1000 : undefined,
    showError: false,
  });

  const loadingPhase = useAgentEnvLoading(currentOrganization?._id);

  useEffect(() => {
    if (environments?.length) {
      user?.reload();
      organization?.reload();
      setEnvLoaded(true);
    }
  }, [environments, user, organization]);

  useEffect(() => {
    telemetry(TelemetryEvent.AGENTS_SETUP_PAGE_VIEWED);
  }, [telemetry]);

  const [phase, setPhase] = useState<SetupPhase>('connect');
  const [createdAgent, setCreatedAgent] = useState<AgentResponse | null>(null);
  const [connectSummary, setConnectSummary] = useState<ConnectSummary | null>(null);
  const [setupComplete, setSetupComplete] = useState(false);
  const [selectedRuntime, setSelectedRuntime] = useState<AgentFlowRuntime>('scratch');

  const handleAgentCreated = useCallback((agent: AgentResponse, summary: ConnectSummary) => {
    setCreatedAgent(agent);
    setConnectSummary(summary);
    setPhase('details');
  }, []);

  const handleRuntimeChange = useCallback((runtime: RuntimeType) => {
    setSelectedRuntime(toIllustrationRuntime(runtime));
  }, []);

  const handleSkip = useCallback(() => {
    telemetry(TelemetryEvent.SKIP_ONBOARDING_CLICKED, { usecase: 'agents', skippedFrom: 'agents-setup' });
    telemetry(TelemetryEvent.ONBOARDING_REDIRECT, { appId, from: 'skip' });

    if (currentEnvironment?.slug) {
      void navigate(getPostOnboardingRoute(appId, currentEnvironment.slug));

      return;
    }

    void navigate(withAppId(ROUTES.WORKFLOWS, appId));
  }, [appId, currentEnvironment?.slug, navigate, telemetry]);

  const handleNavigateToOverview = useCallback(() => {
    telemetry(TelemetryEvent.ONBOARDING_COMPLETED, { usecase: 'agents' });
    telemetry(TelemetryEvent.ONBOARDING_REDIRECT, { appId, from: 'complete' });

    if (currentEnvironment?.slug) {
      void navigate(getPostOnboardingRoute(appId, currentEnvironment.slug));
    }
  }, [appId, currentEnvironment?.slug, navigate, telemetry]);

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

  const handleBackToConnect = useCallback(() => setPhase('connect'), []);

  if (!isAgentsEnabled) {
    return <Navigate to={ROUTES.INBOX_USECASE} replace />;
  }

  if (!currentEnvironment || loadingPhase !== 'ready') {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <PageMeta title="Let's connect your agent to where you work" />
        <OnboardingLoader />
      </div>
    );
  }

  const leftContent = (
    <>
      <PageMeta title="Let's connect your agent to where you work" />
      <StepHeader
        current={phase === 'connect' ? 2 : 3}
        onBack={phase === 'connect' ? () => navigate(ROUTES.USECASE_SELECT) : handleBackToConnect}
      />

      <h1 className="text-foreground text-lg font-medium tracking-[-0.27px]">
        Let's connect your agent to where you work
      </h1>
      <p className="text-text-soft mt-1 text-xs font-medium leading-4">
        A few steps to your first multi-channel agent conversation.
      </p>

      {/*
       * Collapse the connect-phase steps and expand the details-phase steps inline. Same
       * height/opacity + clipPath pattern used by `ConnectPhaseRecap` so the two transitions
       * read as one continuous timeline rather than a page swap.
       */}
      <AnimatePresence mode="wait" initial={false}>
        {phase === 'connect' ? (
          <motion.div
            key="connect"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            style={{ clipPath: 'inset(0 -100% -100% -100%)' }}
          >
            <div className="relative">
              <ConnectAgentStep
                onAgentCreated={handleAgentCreated}
                onRuntimeChange={handleRuntimeChange}
                isManagedEnabled={isManagedEnabled}
              />
            </div>
          </motion.div>
        ) : createdAgent ? (
          <motion.div
            key="details"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            style={{ clipPath: 'inset(0 -100% -100% -100%)' }}
          >
            <AgentSetupSteps
              agent={createdAgent}
              onSetupComplete={() => setSetupComplete(true)}
              hideAddProvider
              connectSummary={connectSummary}
            />

            {setupComplete && (
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
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <SkipBanner onSkip={handleSkip} />
    </>
  );
  const illustrationState = getIllustrationState({ phase, setupComplete });
  const illustrationRuntime = createdAgent ? resolveCreatedAgentRuntime(createdAgent) : selectedRuntime;

  return (
    <OnboardingShell
      left={leftContent}
      right={<AgentFlowIllustration state={illustrationState} runtime={illustrationRuntime} />}
      maxLeftWidth="860px"
      alignLeft="top"
    />
  );
}
