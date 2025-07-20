import { useEffect, useState, useCallback, useRef } from 'react';
import type { IEnvironment } from '@novu/shared';

import { AuthCard } from '../components/auth/auth-card';
import { PageMeta } from '../components/page-meta';
import { InboxPlayground } from '../components/auth/inbox-playground';
import { LoadingIndicator } from '../components/primitives/loading-indicator';
import { AnimatedPage } from '@/components/onboarding/animated-page';
import { useTelemetry } from '../hooks/use-telemetry';
import { TelemetryEvent } from '../utils/telemetry';
import { useAuth } from '../context/auth/hooks';
import { useEnvironment } from '../context/environment/hooks';
import { useFetchEnvironments } from '../context/environment/hooks';

interface InboxUsecasePageProps {
  currentEnvironment?: IEnvironment;
}

interface RequiredData {
  appId: string;
  subscriberId: string;
}

interface DelightfulState {
  phase: 'initializing' | 'loading' | 'connecting' | 'finalizing' | 'refreshing' | 'ready';
  message: string;
  progress: number;
  autoRefreshCount: number;
}

const DelightfulLoadingState = ({ state }: { state: DelightfulState }) => {
  const { phase, message, progress, autoRefreshCount } = state;

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8" aria-live="polite">
      <div className="max-w-md text-center">
        <div className="mb-6">
          <LoadingIndicator size="md" className="mx-auto" />
        </div>

        <h3 className="mb-3 text-lg font-medium text-neutral-950">{message}</h3>

        <div className="mx-auto mb-6 w-80">
          <div className="h-1 overflow-hidden rounded-full bg-neutral-200">
            <div
              className="bg-primary-base h-1 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {autoRefreshCount > 0 && <p className="text-xs text-neutral-400">Retrying connection ({autoRefreshCount}/3)</p>}
      </div>
    </div>
  );
};

const useDelightfulInboxData = (organizationId?: string) => {
  const [state, setState] = useState<DelightfulState>({
    phase: 'initializing',
    message: 'Setting up your inbox',
    progress: 10,
    autoRefreshCount: 0,
  });

  const { refetchEnvironments } = useFetchEnvironments({ organizationId });

  const phaseTimeoutRef = useRef<NodeJS.Timeout>();
  const autoRefreshTimeoutRef = useRef<NodeJS.Timeout>();
  const progressTimeoutRef = useRef<NodeJS.Timeout>();

  const animateProgress = useCallback((target: number, duration = 1000) => {
    setState((prev) => {
      const start = prev.progress;
      const diff = target - start;
      const startTime = Date.now();

      const updateProgress = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const currentProgress = start + diff * progress;

        setState((prev) => ({ ...prev, progress: currentProgress }));

        if (progress < 1) {
          progressTimeoutRef.current = setTimeout(updateProgress, 16);
        }
      };

      updateProgress();
      return prev;
    });
  }, []);

  const progressToPhase = useCallback(
    (newPhase: DelightfulState['phase'], progress: number, message: string) => {
      setState((prev) => ({
        ...prev,
        phase: newPhase,
        message,
      }));

      animateProgress(progress);
    },
    [animateProgress]
  );

  const initializeAndFetch = useCallback(async () => {
    if (!organizationId) return;

    try {
      progressToPhase('initializing', 25, 'Initializing workspace');
      await new Promise((resolve) => setTimeout(resolve, 800));

      progressToPhase('loading', 50, 'Loading environment');
      await new Promise((resolve) => setTimeout(resolve, 500));

      progressToPhase('connecting', 75, 'Connecting to inbox');

      await refetchEnvironments();

      progressToPhase('finalizing', 95, 'Finalizing setup');
      await new Promise((resolve) => setTimeout(resolve, 600));

      setState((prev) => ({
        ...prev,
        phase: 'ready',
        message: 'Inbox ready',
        progress: 100,
      }));
    } catch (error) {
      console.warn('Fetch failed, will auto-refresh...', error);

      const newCount = state.autoRefreshCount + 1;

      setState((prev) => {
        if (newCount <= 3) {
          return {
            ...prev,
            phase: 'refreshing',
            message: `Optimizing connection (${newCount}/3)`,
            progress: 40,
            autoRefreshCount: newCount,
          };
        } else {
          return {
            ...prev,
            phase: 'refreshing',
            message: 'Refreshing page',
            progress: 80,
            autoRefreshCount: newCount,
          };
        }
      });

      if (newCount <= 3) {
        autoRefreshTimeoutRef.current = setTimeout(
          () => {
            initializeAndFetch();
          },
          2000 + newCount * 1000
        );
      } else {
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      }
    }
  }, [organizationId, refetchEnvironments, progressToPhase]);

  useEffect(() => {
    if (organizationId) {
      phaseTimeoutRef.current = setTimeout(() => {
        initializeAndFetch();
      }, 200);
    }

    return () => {
      [phaseTimeoutRef, autoRefreshTimeoutRef, progressTimeoutRef].forEach((ref) => {
        if (ref.current) clearTimeout(ref.current);
      });
    };
  }, [organizationId, initializeAndFetch]);

  return state;
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

export function InboxUsecasePage({ currentEnvironment }: InboxUsecasePageProps) {
  const telemetry = useTelemetry();
  const { currentUser, currentOrganization } = useAuth();
  const { currentEnvironment: envFromContext } = useEnvironment();

  const delightfulState = useDelightfulInboxData(currentOrganization?._id);

  const environment = currentEnvironment || envFromContext;

  const requiredData = getRequiredData(environment, currentUser?._id, currentOrganization?._id);

  useEffect(() => {
    telemetry(TelemetryEvent.INBOX_USECASE_PAGE_VIEWED);
  }, [telemetry]);

  const shouldShowLoading = !requiredData || delightfulState.phase !== 'ready';

  useEffect(() => {
    if (shouldShowLoading) {
      const refreshTimeout = setTimeout(() => {
        window.location.reload();
      }, 3000);

      return () => clearTimeout(refreshTimeout);
    }
  }, [shouldShowLoading]);

  if (shouldShowLoading) {
    let adjustedState = { ...delightfulState };

    if (!currentUser) {
      adjustedState = {
        ...adjustedState,
        phase: 'initializing',
        message: 'Authenticating account',
        progress: 15,
      };
    } else if (!currentOrganization) {
      adjustedState = {
        ...adjustedState,
        phase: 'loading',
        message: 'Loading workspace',
        progress: 35,
      };
    }

    return (
      <AnimatedPage>
        <PageMeta title="Integrate with the Inbox component" />
        <AuthCard>
          <DelightfulLoadingState state={adjustedState} />
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
