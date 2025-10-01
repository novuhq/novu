import { FeatureFlagsKeysEnum } from '@novu/shared';
import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { AnimatedOutlet } from '@/components/animated-outlet';
import { ContextList } from '@/components/contexts';
import { DashboardLayout } from '@/components/dashboard-layout';
import { PageMeta } from '@/components/page-meta';
import { Badge } from '@/components/primitives/badge';
import { useEnvironment } from '@/context/environment/hooks';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useTelemetry } from '@/hooks/use-telemetry';
import { buildRoute, ROUTES } from '@/utils/routes';
import { TelemetryEvent } from '@/utils/telemetry';

export const ContextsPage = () => {
  const track = useTelemetry();
  const isContextEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_CONTEXT_ENABLED, false);
  const { currentEnvironment } = useEnvironment();

  useEffect(() => {
    track(TelemetryEvent.CONTEXTS_PAGE_VISIT);
  }, [track]);

  if (!isContextEnabled) {
    return (
      <Navigate
        to={
          currentEnvironment?.slug
            ? buildRoute(ROUTES.WORKFLOWS, { environmentSlug: currentEnvironment.slug })
            : ROUTES.ROOT
        }
      />
    );
  }

  return (
    <>
      <PageMeta title="Contexts" />
      <DashboardLayout
        headerStartItems={
          <h1 className="text-foreground-950 flex items-center gap-1">
            Contexts{' '}
            <Badge color="gray" size="sm">
              BETA
            </Badge>
          </h1>
        }
      >
        <ContextList />
        <AnimatedOutlet />
      </DashboardLayout>
    </>
  );
};
