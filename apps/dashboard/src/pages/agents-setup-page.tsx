import { useOrganization, useUser } from '@clerk/clerk-react';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { RiArrowLeftSLine, RiArrowRightSLine, RiCalendarEventLine } from 'react-icons/ri';
import { Navigate, useNavigate } from 'react-router-dom';
import { BOOK_DEMO_URL } from '@/components/header-navigation/support-drawer-constants';
import { AgentBridgeConnectedIllustration } from '@/components/onboarding/agent-bridge-connected-illustration';
import { AgentSetupIllustration } from '@/components/onboarding/agent-setup-illustration';
import { OnboardingLoader } from '@/components/onboarding/onboarding-loader';
import { OnboardingSetupGuide } from '@/components/onboarding/onboarding-setup-guide';
import { OnboardingShell } from '@/components/onboarding/onboarding-shell';
import { PageMeta } from '@/components/page-meta';
import { Button } from '@/components/primitives/button';
import { useAuth } from '@/context/auth/hooks';
import { useEnvironment, useFetchEnvironments } from '@/context/environment/hooks';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useTelemetry } from '@/hooks/use-telemetry';
import { buildRoute, ROUTES } from '@/utils/routes';
import { TelemetryEvent } from '@/utils/telemetry';

type LoadingPhase = 'initializing' | 'loading' | 'ready' | 'error';

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
        initializeAndFetch();
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

export function AgentsSetupPage() {
  const isAgentsEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_CONVERSATIONAL_AGENTS_ENABLED, false);
  const navigate = useNavigate();
  const { user } = useUser();
  const { organization } = useOrganization();
  const telemetry = useTelemetry();
  const { currentOrganization } = useAuth();
  const { currentEnvironment } = useEnvironment();

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

  const [bridgeConnected, setBridgeConnected] = useState(false);

  if (!isAgentsEnabled) {
    return <Navigate to={ROUTES.INBOX_USECASE} replace />;
  }

  if (!currentEnvironment || loadingPhase !== 'ready') {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <PageMeta title="Let's add voice to your agent" />
        <OnboardingLoader />
      </div>
    );
  }

  const leftContent = (
    <>
      <PageMeta title="Let's add voice to your agent" />
      <button
        type="button"
        onClick={() => navigate(ROUTES.USECASE_SELECT)}
        className="mb-5 flex cursor-pointer items-center gap-0.5"
      >
        <RiArrowLeftSLine className="text-text-sub size-4" />
        <span className="text-text-sub text-xs">2/3</span>
      </button>

      <h1 className="text-foreground text-lg font-medium tracking-[-0.27px]">Set up your first agent.</h1>
      <p className="text-text-soft mt-1 text-xs font-medium leading-4">
        A few steps to your first multi-channel agent conversation.
      </p>

      <div className="border-stroke-soft bg-bg-weak mt-4 flex items-center gap-3 rounded-lg border px-2 py-1.5">
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
            onClick={() => {
              telemetry(TelemetryEvent.SKIP_ONBOARDING_CLICKED, { usecase: 'agents', skippedFrom: 'agents-setup' });
              navigate(ROUTES.WORKFLOWS);
            }}
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

      <OnboardingSetupGuide onBridgeConnected={() => setBridgeConnected(true)} />

      {bridgeConnected && (
        <div className="mt-6 pb-10">
          <Button
            className="text-label-xs gap-1 rounded-lg p-2"
            variant="primary"
            size="xs"
            onClick={() => {
              telemetry(TelemetryEvent.ONBOARDING_COMPLETED, { usecase: 'agents' });
              navigate(buildRoute(ROUTES.AGENTS, { environmentSlug: currentEnvironment?.slug ?? '' }));
            }}
          >
            Navigate to dashboard
            <RiArrowRightSLine className="size-4" />
          </Button>
        </div>
      )}
    </>
  );

  const rightContent = bridgeConnected ? <AgentBridgeConnectedIllustration /> : <AgentSetupIllustration />;

  return <OnboardingShell left={leftContent} right={rightContent} maxLeftWidth="860px" alignLeft="top" />;
}
