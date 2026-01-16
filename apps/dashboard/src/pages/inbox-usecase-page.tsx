import { useOrganization, useUser } from '@clerk/clerk-react';
import type { IEnvironment } from '@novu/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatedPage } from '@/components/onboarding/animated-page';
import { AuthCard } from '../components/auth/auth-card';
import { InboxPlayground } from '../components/auth/inbox-playground';
import { PageMeta } from '../components/page-meta';
import { useAuth } from '../context/auth/hooks';
import { useEnvironment, useFetchEnvironments } from '../context/environment/hooks';
import { useTelemetry } from '../hooks/use-telemetry';
import { TelemetryEvent } from '../utils/telemetry';

interface RequiredData {
  appId: string;
  subscriberId: string;
}

type LoadingPhase = 'initializing' | 'loading' | 'ready' | 'error';

const InboxLoadingSkeleton = () => {
  return (
    <div className="flex flex-1 flex-col overflow-hidden pb-3">
      {/* Header skeleton - matches UsecasePlaygroundHeader */}
      <div className="px-8 pb-6 pt-8">
        <div className="space-y-4">
          {/* Title skeleton */}
          <div className="h-8 w-80 animate-pulse rounded bg-neutral-200"></div>

          {/* Description skeleton */}
          <div className="h-4 w-96 animate-pulse rounded bg-neutral-200"></div>
        </div>
      </div>

      {/* Main content area with background */}
      <div
        className="flex flex-1 flex-col"
        style={{
          backgroundImage: 'url(/images/auth/Content.svg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="flex flex-1">
          {/* Left side - App name skeleton */}
          <div className="flex flex-1 items-start justify-start">
            <div className="ml-10 mt-9">
              <div className="h-6 w-32 animate-pulse rounded bg-neutral-200"></div>
            </div>
          </div>

          {/* Right side - Inbox skeleton */}
          <div className="flex flex-1 flex-col">
            <div className="flex items-start justify-end">
              <div className="mr-20 mt-16 h-[470px] w-[375px] overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
                {/* Inbox header skeleton */}
                <div className="border-b border-neutral-100 p-4">
                  <div className="flex items-center justify-between">
                    <div className="h-5 w-16 animate-pulse rounded bg-neutral-200"></div>
                    <div className="h-6 w-6 animate-pulse rounded bg-neutral-200"></div>
                  </div>
                </div>

                {/* Tabs skeleton */}
                <div className="border-b border-neutral-100 px-4 pb-2 pt-3">
                  <div className="flex space-x-6">
                    <div className="h-4 w-8 animate-pulse rounded bg-neutral-200"></div>
                    <div className="h-4 w-20 animate-pulse rounded bg-neutral-200"></div>
                    <div className="h-4 w-24 animate-pulse rounded bg-neutral-200"></div>
                  </div>
                </div>

                {/* Content area skeleton */}
                <div className="space-y-3 p-4">
                  {/* Empty state or notification items */}
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-4 h-12 w-12 animate-pulse rounded-full bg-neutral-200"></div>
                    <div className="mb-2 h-4 w-48 animate-pulse rounded bg-neutral-200"></div>
                    <div className="h-3 w-32 animate-pulse rounded bg-neutral-200"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

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
    setTimeout(() => {
      // this is a little workaround to prevent race conditions during initial sync flow of new organizations
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
          <InboxLoadingSkeleton />
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
