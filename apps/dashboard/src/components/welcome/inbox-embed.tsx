import { ChannelTypeEnum } from '@novu/shared';
import { useEffect, useState } from 'react';
import ReactConfetti from 'react-confetti';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { IS_EU, MODE } from '../../config';
import { useAuth } from '../../context/auth/hooks';
import { useEnvironment } from '../../context/environment/hooks';
import { useFetchIntegrations } from '../../hooks/use-fetch-integrations';
import { ROUTES } from '../../utils/routes';
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
  const { environments, areEnvironmentsInitialLoading } = useEnvironment();

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const environmentHint = searchParams.get('environmentId');

  const selectedEnvironment = environments?.find((env) =>
    environmentHint ? env._id === environmentHint : !env._parentId
  );
  const subscriberId = currentUser?._id;

  const foundIntegration = integrations?.find(
    (integration) =>
      integration._environmentId === selectedEnvironment?._id && integration.channel === ChannelTypeEnum.IN_APP
  );

  const isInAppConnected = foundIntegration?.connected ?? false;

  const primaryColor = searchParams.get('primaryColor') || '#DD2450';
  const foregroundColor = searchParams.get('foregroundColor') || '#0E121B';

  const validateUrl = (urlString: string | null, allowedProtocols: string[]): string | undefined => {
    if (!urlString) return undefined;

    const trimmedUrl = urlString.trim();
    if (!trimmedUrl) return undefined;

    try {
      const url = new URL(trimmedUrl);
      return allowedProtocols.includes(url.protocol) ? trimmedUrl : undefined;
    } catch {
      return undefined;
    }
  };

  const shouldShowCustomUrls = MODE !== 'production' && !IS_EU;
  const backendUrl = shouldShowCustomUrls
    ? validateUrl(searchParams.get('backendUrl'), ['http:', 'https:'])
    : undefined;
  const socketUrl = shouldShowCustomUrls
    ? validateUrl(searchParams.get('socketUrl'), ['ws:', 'wss:', 'http:', 'https:'])
    : undefined;

  const isOnWelcomeRoute = location.pathname === ROUTES.WELCOME || location.pathname.startsWith(`${ROUTES.WELCOME}/`);

  useEffect(() => {
    if (areEnvironmentsInitialLoading || isOnWelcomeRoute) {
      return;
    }

    if (!subscriberId || !selectedEnvironment) {
      navigate(ROUTES.WELCOME, { replace: true });
      return;
    }
  }, [subscriberId, selectedEnvironment, navigate, areEnvironmentsInitialLoading, isOnWelcomeRoute]);

  useEffect(() => {
    if (isInAppConnected) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 10000);

      return () => clearTimeout(timer);
    }
  }, [isInAppConnected]);

  if (isOnWelcomeRoute) {
    return null;
  }

  if (areEnvironmentsInitialLoading) {
    return null;
  }

  if (!subscriberId || !selectedEnvironment) return null;

  if (!foundIntegration) {
    return (
      <main className={LAYOUT_CONSTANTS.MAIN_PADDING_LEFT}>
        <InboxFrameworkGuide
          currentEnvironment={selectedEnvironment}
          subscriberId={subscriberId}
          primaryColor={primaryColor}
          foregroundColor={foregroundColor}
          backendUrl={backendUrl}
          socketUrl={socketUrl}
        />
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
          backendUrl={backendUrl}
          socketUrl={socketUrl}
        />
      )}
    </main>
  );
}
