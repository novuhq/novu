import { ChannelTypeEnum } from '@novu/shared';
import { useEffect, useState } from 'react';
import ReactConfetti from 'react-confetti';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/auth/hooks';
import { useEnvironment } from '../../context/environment/hooks';
import { useFetchIntegrations } from '../../hooks/use-fetch-integrations';
import { useTelemetry } from '../../hooks/use-telemetry';
import { ROUTES } from '../../utils/routes';
import { TelemetryEvent } from '../../utils/telemetry';
import { InboxConnectedGuide } from './inbox-connected-guide';
import { InboxFrameworkGuide } from './inbox-framework-guide';

const LAYOUT_CONSTANTS = {
  MAIN_PADDING_LEFT: 'pl-[100px]',
  FOOTER_MARGIN_LEFT: '-ml-[100px]',
} as const;

export function InboxEmbed(): JSX.Element | null {
  const [showConfetti, setShowConfetti] = useState(false);
  const { currentUser } = useAuth();
  const { integrations } = useFetchIntegrations({ refetchInterval: 1000, refetchOnWindowFocus: true });
  const { environments } = useEnvironment();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const telemetry = useTelemetry();
  const environmentHint = searchParams.get('environmentId');

  const selectedEnvironment = environments?.find((env) =>
    environmentHint ? env._id === environmentHint : !env._parentId
  );
  const subscriberId = currentUser?._id;

  const foundIntegration = integrations?.find(
    (integration) =>
      integration._environmentId === selectedEnvironment?._id && integration.channel === ChannelTypeEnum.IN_APP
  );

  const primaryColor = searchParams.get('primaryColor') || '#DD2450';
  const foregroundColor = searchParams.get('foregroundColor') || '#0E121B';

  useEffect(() => {
    if (!subscriberId || !selectedEnvironment) {
      navigate(ROUTES.WELCOME);
      return;
    }
  }, [subscriberId, selectedEnvironment, navigate]);

  useEffect(() => {
    if (foundIntegration?.connected) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 10000);

      return () => clearTimeout(timer);
    }
  }, [foundIntegration]);

  if (!subscriberId || !selectedEnvironment) return null;

  if (!foundIntegration) {
    return (
      <main className={LAYOUT_CONSTANTS.MAIN_PADDING_LEFT}>
        <InboxFrameworkGuide
          currentEnvironment={selectedEnvironment}
          subscriberId={subscriberId}
          primaryColor={primaryColor}
          foregroundColor={foregroundColor}
        />

        <footer className={`pt-32 pb-6 ${LAYOUT_CONSTANTS.FOOTER_MARGIN_LEFT}`}>
          <div className="flex justify-center">
            <button
              type="button"
              className="px-6 py-2 text-xs font-medium text-[#525866] hover:underline hover:underline-offset-2 transition-colors"
              onClick={() => {
                telemetry(TelemetryEvent.SKIP_ONBOARDING_CLICKED, {
                  skippedFrom: 'inbox-embed',
                });
                navigate(ROUTES.WELCOME);
              }}
            >
              Skip to the Dashboard
            </button>
          </div>
        </footer>
      </main>
    );
  }

  return (
    <main className={LAYOUT_CONSTANTS.MAIN_PADDING_LEFT}>
      {showConfetti && <ReactConfetti recycle={false} numberOfPieces={1000} />}
      {foundIntegration?.connected ? (
        <InboxConnectedGuide subscriberId={subscriberId} environment={selectedEnvironment} />
      ) : (
        <InboxFrameworkGuide
          currentEnvironment={selectedEnvironment}
          subscriberId={subscriberId}
          primaryColor={primaryColor}
          foregroundColor={foregroundColor}
        />
      )}

      <footer className={`pt-32 pb-6 ${LAYOUT_CONSTANTS.FOOTER_MARGIN_LEFT}`}>
        <div className="flex justify-center">
          <button
            type="button"
            className="px-6 py-2 text-xs font-medium text-[#525866] hover:underline hover:underline-offset-2 transition-colors"
            onClick={() => {
              telemetry(TelemetryEvent.SKIP_ONBOARDING_CLICKED, {
                skippedFrom: foundIntegration?.connected ? 'inbox-connected-guide' : 'inbox-embed',
              });
              navigate(ROUTES.HOME);
            }}
          >
            Skip to the Dashboard
          </button>
        </div>
      </footer>
    </main>
  );
}
