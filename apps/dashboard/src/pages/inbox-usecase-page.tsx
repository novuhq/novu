import { useOrganization, useUser } from '@clerk/react';
import type { IEnvironment } from '@novu/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatedPage } from '@/components/onboarding/animated-page';
import { OnboardingLoader } from '@/components/onboarding/onboarding-loader';
import { AuthCard } from '../components/auth/auth-card';
import { InboxPlayground } from '../components/auth/inbox-playground';
import { PageMeta } from '../components/page-meta';
import { useAuth } from '../context/auth/hooks';
import { useEnvironment, useFetchEnvironments } from '../context/environment/hooks';
import { useOnboardingProvisioningActive, useOnboardingProvisioningDismiss } from '@/hooks/use-onboarding-provisioning';
import { useTelemetry } from '../hooks/use-telemetry';
import { TelemetryEvent } from '../utils/telemetry';
import { sendGTMEvent } from '../utils/tracking';

interface RequiredData {
  appId: string;
  subscriberId: string;
}

type LoadingPhase = 'initializing' | 'loading' | 'ready' | 'error';

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
        void initializeAndFetch();
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
  const provisioningActive = useOnboardingProvisioningActive();
  const isDataReady = Boolean(requiredData) && loadingPhase === 'ready';

  useOnboardingProvisioningDismiss({
    isReady: isDataReady,
    fallbackVariant: 'platform',
  });

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

  if (!isDataReady || provisioningActive || !requiredData) {
    if (provisioningActive) {
      return null;
    }

    return (
      <AnimatedPage>
        <PageMeta title="Integrate with the Inbox component" />
        <AuthCard>
          <OnboardingLoader variant="platform" />
        </AuthCard>
      </AnimatedPage>
    );
  }

  const { appId, subscriberId } = requiredData;

  return (
    <AnimatedPage>
      <PageMeta title="Integrate with the Inbox component" />
      <AuthCard>
        <InboxPlayground appId={appId} subscriberId={subscriberId} />
      </AuthCard>
    </AnimatedPage>
  );
}
