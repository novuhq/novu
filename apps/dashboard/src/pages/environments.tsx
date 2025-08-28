import { PageMeta } from '@/components/page-meta';
import { ApiServiceLevelEnum, FeatureNameEnum, getFeatureForTierAsBoolean } from '@novu/shared';
import { useEffect } from 'react';
import { DashboardLayout } from '../components/dashboard-layout';
import { CreateEnvironmentButton } from '../components/environments/create-environment-button';
import { FreeTierState } from '../components/environments/environments-free-state';
import { EnvironmentsList } from '../components/environments/environments-list';
import { IS_ENTERPRISE, IS_SELF_HOSTED } from '../config';
import { useAuth } from '../context/auth/hooks';
import { useFetchEnvironments } from '../context/environment/hooks';
import { useFetchSubscription } from '../hooks/use-fetch-subscription';
import { useTelemetry } from '../hooks/use-telemetry';
import { TelemetryEvent } from '../utils/telemetry';

export function EnvironmentsPage() {
  const { currentOrganization } = useAuth();
  const { environments = [], areEnvironmentsInitialLoading } = useFetchEnvironments({
    organizationId: currentOrganization?._id,
  });
  const track = useTelemetry();
  const { subscription } = useFetchSubscription();

  const isTierEligibleForCustomEnvironments = getFeatureForTierAsBoolean(
    FeatureNameEnum.CUSTOM_ENVIRONMENTS_BOOLEAN,
    subscription?.apiServiceLevel || ApiServiceLevelEnum.FREE
  );
  const isTrialActive = subscription?.trial?.isActive;
  const allowedToAccessEnvironments =
    areEnvironmentsInitialLoading || !subscription || (isTierEligibleForCustomEnvironments && !isTrialActive);
  const canAccessEnvironments = allowedToAccessEnvironments && (!IS_SELF_HOSTED || IS_ENTERPRISE);

  useEffect(() => {
    track(TelemetryEvent.ENVIRONMENTS_PAGE_VIEWED);
  }, [track]);

  return (
    <>
      <PageMeta title={`Environments`} />
      <DashboardLayout headerStartItems={<h1 className="text-foreground-950">Environments</h1>}>
        {canAccessEnvironments ? (
          <div className="flex flex-col justify-between gap-2 py-2">
            <div className="flex justify-end">
              <CreateEnvironmentButton />
            </div>
            <EnvironmentsList environments={environments} isLoading={areEnvironmentsInitialLoading} />
          </div>
        ) : (
          <FreeTierState />
        )}
      </DashboardLayout>
    </>
  );
}
