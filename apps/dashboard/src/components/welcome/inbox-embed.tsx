import { ChannelTypeEnum } from '@novu/shared';
import { useEffect, useRef, useState } from 'react';
import ReactConfetti from 'react-confetti';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { IS_EU, MODE } from '../../config';
import { useAuth } from '../../context/auth/hooks';
import { useEnvironment } from '../../context/environment/hooks';
import { useFetchIntegrations } from '../../hooks/use-fetch-integrations';
import { useInboxIntegrationWorkflowUpdater } from '../../hooks/use-inbox-integration-workflow-updater';
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

  // Stable refs to prevent effect re-runs on object identity changes
  const lastUpdateKeyRef = useRef<string>('');

  // Hook to update workflows with in-app steps when inbox integration is connected
  const { triggerWorkflowUpdate, hasWorkflowsWithInAppSteps } = useInboxIntegrationWorkflowUpdater({
    onSuccess: (updatedWorkflowSlugs) => {
      console.log('Successfully updated workflows with in-app steps:', updatedWorkflowSlugs);
    },
  });
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

  // Compute stable boolean and key to prevent effect re-runs on object identity changes
  const isInAppConnected = foundIntegration?.connected ?? false;
  const currentKey = `${selectedEnvironment?._id}-${foundIntegration?._id}`;

  const primaryColor = searchParams.get('primaryColor') || '#DD2450';
  const foregroundColor = searchParams.get('foregroundColor') || '#0E121B';

  // Helper function to safely validate URLs
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

  // Only show backendUrl and socketUrl if not production and not EU region
  const shouldShowCustomUrls = MODE !== 'production' && !IS_EU;
  const backendUrl = shouldShowCustomUrls
    ? validateUrl(searchParams.get('backendUrl'), ['http:', 'https:'])
    : undefined;
  const socketUrl = shouldShowCustomUrls
    ? validateUrl(searchParams.get('socketUrl'), ['ws:', 'wss:', 'http:', 'https:'])
    : undefined;

  // Check if we're already on the WELCOME route to prevent redirect loops
  const isOnWelcomeRoute = location.pathname === ROUTES.WELCOME || location.pathname.startsWith(`${ROUTES.WELCOME}/`);

  useEffect(() => {
    // Wait for environments to load and ensure we're not already on WELCOME route
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

      // Trigger workflow update when inbox integration is connected
      // Only trigger if this is a new connection (different environment/integration)
      if (hasWorkflowsWithInAppSteps && lastUpdateKeyRef.current !== currentKey) {
        triggerWorkflowUpdate();
        lastUpdateKeyRef.current = currentKey;
      }

      return () => clearTimeout(timer);
    }
  }, [isInAppConnected, currentKey, hasWorkflowsWithInAppSteps, triggerWorkflowUpdate]);

  // Don't render if we're on the WELCOME route to avoid redirect loops
  if (isOnWelcomeRoute) {
    return null;
  }

  // Don't render while environments are still loading
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
