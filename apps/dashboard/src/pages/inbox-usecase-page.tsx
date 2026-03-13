import { useOrganization, useUser } from '@clerk/clerk-react';
import type { IEnvironment } from '@novu/shared';
import { motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { RiCheckboxCircleFill, RiLoader3Line, RiLoader4Fill } from 'react-icons/ri';
import { AnimatedPage } from '@/components/onboarding/animated-page';
import { AuthCard } from '../components/auth/auth-card';
import { InboxPlayground } from '../components/auth/inbox-playground';
import { LogoCircle } from '../components/icons/logo-circle';
import { PageMeta } from '../components/page-meta';
import { useAuth } from '../context/auth/hooks';
import { useEnvironment, useFetchEnvironments } from '../context/environment/hooks';
import { useTelemetry } from '../hooks/use-telemetry';
import { TelemetryEvent } from '../utils/telemetry';
import { sendGTMEvent } from '../utils/tracking';

interface RequiredData {
  appId: string;
  subscriberId: string;
}

type LoadingPhase = 'initializing' | 'loading' | 'ready' | 'error';

const STEP_DELAY_MS = 1500;

const ONBOARDING_STEPS = [
  { id: 'org', text: 'Preparing your organization' },
  { id: 'env', text: 'Setting up your environment' },
  { id: 'channels', text: 'Configuring notification channels' },
  { id: 'inbox', text: 'Getting your inbox ready' },
  { id: 'final', text: 'Almost there...' },
] as const;

const ITEM_HEIGHT = 20;
const GAP = 12;
const CONTAINER_HEIGHT = 140;

function OnboardingLoader() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => {
        if (prev >= ONBOARDING_STEPS.length - 1) return prev;

        return prev + 1;
      });
    }, STEP_DELAY_MS);

    return () => clearInterval(interval);
  }, []);

  const steps = ONBOARDING_STEPS.map((step, index) => {
    const status = index < activeIndex ? 'success' : index === activeIndex ? 'progress' : 'pending';

    return { ...step, status };
  });

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex flex-col items-center gap-4"
      >
        <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>
          <LogoCircle className="size-10" />
        </motion.div>
        <motion.span
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="text-label-md text-text-strong font-medium"
        >
          Setting up your workspace
        </motion.span>
      </motion.div>

      <div className="relative w-full max-w-xs overflow-hidden" style={{ height: CONTAINER_HEIGHT }}>
        <div
          className="absolute inset-0"
          style={{
            maskImage: 'linear-gradient(to bottom, transparent 0%, black 35%, black 65%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 35%, black 65%, transparent 100%)',
          }}
        >
          <motion.div
            className="absolute left-0 right-0 flex flex-col items-center"
            style={{ gap: GAP }}
            initial={false}
            animate={{ y: CONTAINER_HEIGHT / 2 - ITEM_HEIGHT / 2 - activeIndex * (ITEM_HEIGHT + GAP) }}
            transition={{ type: 'tween', ease: 'easeInOut', duration: 0.4 }}
          >
            {steps.map((step, index) => (
              <motion.div
                key={step.id}
                className="flex shrink-0 items-center gap-2"
                style={{ height: ITEM_HEIGHT }}
                animate={{ opacity: index === activeIndex ? 1 : 0.35 }}
                transition={{ duration: 0.3 }}
              >
                {step.status === 'success' && <RiCheckboxCircleFill className="size-4 shrink-0 text-success" />}
                {step.status === 'progress' && <RiLoader4Fill className="size-4 shrink-0 animate-spin text-text-sub" />}
                {step.status === 'pending' && <RiLoader3Line className="size-4 shrink-0 text-text-sub" />}
                <span className="text-label-sm text-text-sub">{step.text}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

const useInboxLoading = (organizationId?: string) => {
  const [phase, setPhase] = useState<LoadingPhase>('initializing');

  const { refetchEnvironments } = useFetchEnvironments({ organizationId });
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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
      loadingTimeoutRef.current = setTimeout(() => {
        initializeAndFetch();
      }, 50);
    }

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [organizationId, initializeAndFetch]);

  return phase;
};

const getRequiredData = (environment?: IEnvironment, userId?: string, organizationId?: string): RequiredData | null => {
  if (!environment?.identifier || !userId || !organizationId) {
    return null;
  }

  return {
    appId: environment.identifier,
    subscriberId: userId,
  };
};

export function InboxUsecasePage() {
  const { user } = useUser();
  const { organization } = useOrganization();
  const telemetry = useTelemetry();
  const { currentUser, currentOrganization } = useAuth();
  const { currentEnvironment: envFromContext } = useEnvironment();
  const [envLoaded, setEnvLoaded] = useState(false);
  const { environments } = useFetchEnvironments({
    organizationId: !envLoaded ? 'org' : '',
    refetchInterval: !envLoaded ? 1000 : undefined,
    showError: false,
  });

  const loadingPhase = useInboxLoading(currentOrganization?._id);
  const environment = envFromContext;
  const requiredData = getRequiredData(environment, currentUser?._id, currentOrganization?._id);

  useEffect(() => {
    sendGTMEvent('sign_up');

    setTimeout(() => {
      telemetry(TelemetryEvent.INBOX_USECASE_PAGE_VIEWED);
    }, 2000);
  }, [telemetry]);

  useEffect(() => {
    if (environments?.length) {
      user?.reload();
      organization?.reload();
      setEnvLoaded(true);
    }
  }, [environments, user, organization]);

  const shouldShowLoading = !requiredData || loadingPhase !== 'ready';

  if (shouldShowLoading) {
    return (
      <AnimatedPage>
        <PageMeta title="Integrate with the Inbox component" />
        <AuthCard>
          <OnboardingLoader />
        </AuthCard>
      </AnimatedPage>
    );
  }

  return (
    <AnimatedPage>
      <PageMeta title="Integrate with the Inbox component" />
      <AuthCard>
        <InboxPlayground appId={requiredData.appId} subscriberId={requiredData.subscriberId} />
      </AuthCard>
    </AnimatedPage>
  );
}
