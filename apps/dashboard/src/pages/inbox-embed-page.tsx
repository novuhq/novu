import { ChannelTypeEnum } from '@novu/shared';
import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatedPage } from '@/components/onboarding/animated-page';
import { AuthCard } from '../components/auth/auth-card';
import { UsecasePlaygroundHeader } from '../components/usecase-playground-header';
import { InboxEmbed } from '../components/welcome/inbox-embed';
import { useEnvironment } from '../context/environment/hooks';
import { useFetchIntegrations } from '../hooks/use-fetch-integrations';
import { useTelemetry } from '../hooks/use-telemetry';
import { ROUTES } from '../utils/routes';
import { TelemetryEvent } from '../utils/telemetry';

export function InboxEmbedPage() {
  const telemetry = useTelemetry();
  const { environments } = useEnvironment();
  const [searchParams] = useSearchParams();
  const environmentHint = searchParams.get('environmentId');

  const selectedEnvironment = useMemo(
    () => environments?.find((env) => (environmentHint ? env._id === environmentHint : !env._parentId)),
    [environments, environmentHint]
  );

  const { integrations } = useFetchIntegrations({
    refetchInterval: undefined,
    refetchOnWindowFocus: false,
  });

  const inAppIntegration = useMemo(
    () =>
      integrations?.find(
        (integration) =>
          integration._environmentId === selectedEnvironment?._id && integration.channel === ChannelTypeEnum.IN_APP
      ),
    [integrations, selectedEnvironment?._id]
  );

  const isInAppConnected = inAppIntegration?.connected;

  // Adaptive polling: only poll if not connected
  const adaptivePollingOptions = useMemo(
    () => ({
      refetchInterval: isInAppConnected ? undefined : 1000,
      refetchOnWindowFocus: false,
    }),
    [isInAppConnected]
  );

  // Re-fetch integrations with adaptive options
  const { integrations: polledIntegrations } = useFetchIntegrations(adaptivePollingOptions);

  const currentIntegrations = polledIntegrations || integrations;

  const currentInAppIntegration = useMemo(
    () =>
      currentIntegrations?.find(
        (integration) =>
          integration._environmentId === selectedEnvironment?._id && integration.channel === ChannelTypeEnum.IN_APP
      ),
    [currentIntegrations, selectedEnvironment?._id]
  );

  const isConnected = currentInAppIntegration?.connected;

  useEffect(() => {
    telemetry(TelemetryEvent.INBOX_EMBED_PAGE_VIEWED);
  }, [telemetry]);

  return (
    <AnimatedPage>
      <AuthCard className="mt-10 w-full max-w-[1230px]">
        <div className="w-full">
          <div className="flex flex-1 flex-col overflow-hidden">
            <UsecasePlaygroundHeader
              title={isConnected ? 'Confirm Your Integration' : 'Minutes to a fully functional <Inbox/>'}
              description={
                isConnected ? 'Send a test notification to verify your connection.' : "Let's connect your inbox to Novu"
              }
              skipPath={ROUTES.WELCOME}
              onSkip={() =>
                telemetry(TelemetryEvent.SKIP_ONBOARDING_CLICKED, {
                  skippedFrom: isConnected ? 'inbox-connected-guide' : 'inbox-embed',
                })
              }
              currentStep={isConnected ? 4 : 3}
              totalSteps={4}
              showSkipButton={false}
            />
          </div>
          <InboxEmbed />
        </div>
      </AuthCard>
    </AnimatedPage>
  );
}
