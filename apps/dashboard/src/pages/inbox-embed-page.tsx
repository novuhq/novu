import { ChannelTypeEnum } from '@novu/shared';
import { useEffect, useMemo } from 'react';
import { RiComputerLine, RiArrowRightSLine } from 'react-icons/ri';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatedPage } from '@/components/onboarding/animated-page';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { AuthCard } from '../components/auth/auth-card';
import { LogoCircle } from '../components/icons/logo-circle';
import { Button } from '../components/primitives/button';
import { UsecasePlaygroundHeader } from '../components/usecase-playground-header';
import { InboxEmbed } from '../components/welcome/inbox-embed';
import { useEnvironment } from '../context/environment/hooks';
import { useFetchIntegrations } from '../hooks/use-fetch-integrations';
import { useTelemetry } from '../hooks/use-telemetry';
import { ROUTES } from '../utils/routes';
import { TelemetryEvent } from '../utils/telemetry';

function MobileEmbedSkip() {
  const navigate = useNavigate();
  const telemetry = useTelemetry();

  const handleGoToDashboard = () => {
    telemetry(TelemetryEvent.SKIP_ONBOARDING_CLICKED, { skippedFrom: 'mobile-embed-skip' });
    navigate(ROUTES.WELCOME);
  };

  return (
    <AnimatedPage>
      <AuthCard className="mx-4 max-w-md">
        <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500/10 to-purple-500/10">
            <LogoCircle className="size-8" />
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-foreground-950 text-xl font-semibold">Continue on desktop</h2>
            <p className="text-foreground-400 text-sm leading-relaxed">
              Embedding the Inbox component requires a code editor and development environment. Open Novu on your
              computer to complete this step.
            </p>
          </div>

          <div className="flex w-full items-center gap-3 rounded-xl bg-neutral-50 px-4 py-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-neutral-200/60">
              <RiComputerLine className="size-5 text-neutral-700" />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-sm font-medium text-neutral-800">Open on your computer</p>
              <p className="truncate text-xs text-neutral-400">Complete the Inbox integration</p>
            </div>
          </div>

          <Button variant="primary" className="mt-2 w-full" trailingIcon={RiArrowRightSLine} onClick={handleGoToDashboard}>
            Skip to Dashboard
          </Button>
        </div>
      </AuthCard>
    </AnimatedPage>
  );
}

export function InboxEmbedPage() {
  const telemetry = useTelemetry();
  const isMobile = useIsMobile();
  const { environments } = useEnvironment();
  const [searchParams] = useSearchParams();
  const environmentHint = searchParams.get('environmentId');

  const selectedEnvironment = useMemo(
    () => environments?.find((env) => (environmentHint ? env._id === environmentHint : !env._parentId)),
    [environments, environmentHint]
  );

  const { integrations } = useFetchIntegrations({
    refetchInterval: 1000,
    refetchOnWindowFocus: false,
  });

  const currentIntegrations = integrations;

  const inAppIntegration = useMemo(
    () =>
      currentIntegrations?.find(
        (integration) =>
          integration._environmentId === selectedEnvironment?._id && integration.channel === ChannelTypeEnum.IN_APP
      ),
    [currentIntegrations, selectedEnvironment?._id]
  );

  const isConnected = inAppIntegration?.connected;

  useEffect(() => {
    telemetry(TelemetryEvent.INBOX_EMBED_PAGE_VIEWED);
  }, [telemetry]);

  if (isMobile) {
    return <MobileEmbedSkip />;
  }

  return (
    <AnimatedPage>
      <AuthCard className="mt-10 w-full max-w-[1230px]">
        <div className="w-full">
          <div className="flex flex-1 flex-col overflow-hidden">
            <UsecasePlaygroundHeader
              title={isConnected ? 'Confirm Your Integration' : 'Minutes to a fully functional <Inbox/>'}
              description={
                isConnected
                  ? 'Send a test notification to verify your connection.'
                  : "Let's add the Inbox component to your app"
              }
              skipPath={ROUTES.WELCOME}
              onSkip={() =>
                telemetry(TelemetryEvent.SKIP_ONBOARDING_CLICKED, {
                  skippedFrom: isConnected ? 'inbox-connected-guide' : 'inbox-embed',
                })
              }
              currentStep={isConnected ? 4 : 3}
              totalSteps={4}
              showSkipButton={true}
            />
          </div>
          <InboxEmbed />
        </div>
      </AuthCard>
    </AnimatedPage>
  );
}
