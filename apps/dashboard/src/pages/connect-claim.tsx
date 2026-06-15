import { useAuth as useClerkAuth } from '@clerk/react';
import type { IEnvironment } from '@novu/shared';
import { EnvironmentTypeEnum } from '@novu/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { RiCheckLine, RiLoader4Line } from 'react-icons/ri';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { type ClaimKeylessConnectResponse, claimKeylessConnect } from '@/api/connect';
import { AuthLayout } from '@/components/auth-layout';
import { PageMeta } from '@/components/page-meta';
import { Button } from '@/components/primitives/button';
import { showErrorToast } from '@/components/primitives/sonner-helpers';
import { useAuth } from '@/context/auth/hooks';
import { EnvironmentProvider } from '@/context/environment/environment-provider';
import { useFetchEnvironments } from '@/context/environment/hooks';
import { BOOTSTRAP_ORG_CACHE_KEY } from '@/context/environment/use-bootstrap-organization';
import { appendRedirectUrlParam } from '@/utils/cli-auth-pending';
import { clearConnectProvisioning } from '@/utils/connect';
import {
  clearPendingConnectClaim,
  parseConnectClaimToken,
  readPendingConnectClaim,
  storePendingConnectClaim,
} from '@/utils/connect-claim-pending';
import { AGENT_DETAILS_DEFAULT_TAB, buildRoute, ROUTES } from '@/utils/routes';

const CLAIM_FAILED_MESSAGE = 'Unable to claim this agent. Please try again or reopen the link from your chat.';
const ENV_READY_TIMEOUT_MS = 60_000;

export const ConnectClaimPage = () => {
  const { isLoaded, isSignedIn } = useClerkAuth();
  const [searchParams] = useSearchParams();
  const token = parseConnectClaimToken(`?${searchParams.toString()}`) ?? readPendingConnectClaim();

  useEffect(() => {
    if (token) {
      storePendingConnectClaim(token);
    }
  }, [token]);

  useEffect(() => {
    clearConnectProvisioning();
  }, []);

  if (!isLoaded) {
    return null;
  }

  if (!isSignedIn) {
    const search = token ? `?token=${encodeURIComponent(token)}` : '';
    const redirectUrl = `${ROUTES.CONNECT_CLAIM}${search}`;
    const signUpUrl = appendRedirectUrlParam(ROUTES.SIGN_UP, redirectUrl);

    return <Navigate to={signUpUrl} replace />;
  }

  return (
    <AuthLayout>
      <EnvironmentProvider>
        <PageMeta title="Keep your Novu agent" />
        <ConnectClaimContent token={token} />
      </EnvironmentProvider>
    </AuthLayout>
  );
};

function getClaimableDevelopmentEnvironment(environments?: IEnvironment[]): IEnvironment | undefined {
  if (!environments?.length) {
    return undefined;
  }

  return (
    environments.find((env) => env.type === EnvironmentTypeEnum.DEV && !env._parentId) ??
    environments.find((env) => !env._parentId)
  );
}

function ConnectClaimContent({ token }: { token: string | null }) {
  const navigate = useNavigate();
  const { currentOrganization } = useAuth();
  const novuOrganizationId = currentOrganization?._id;
  const [isEnvironmentReady, setIsEnvironmentReady] = useState(false);
  const [environmentSetupError, setEnvironmentSetupError] = useState<string | null>(null);
  const { environments } = useFetchEnvironments({
    organizationId: novuOrganizationId || BOOTSTRAP_ORG_CACHE_KEY,
    refetchInterval: isEnvironmentReady || environmentSetupError ? undefined : 1000,
    showError: false,
  });

  useEffect(() => {
    if (getClaimableDevelopmentEnvironment(environments)) {
      setIsEnvironmentReady(true);
      setEnvironmentSetupError(null);
    }
  }, [environments]);

  useEffect(() => {
    if (isEnvironmentReady || environmentSetupError) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setEnvironmentSetupError(
        'Your development environment is taking longer than expected to set up. Please try again in a moment.'
      );
    }, ENV_READY_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isEnvironmentReady, environmentSetupError]);
  const [isClaiming, setIsClaiming] = useState(false);
  const [didClaim, setDidClaim] = useState(false);
  const [claimResult, setClaimResult] = useState<ClaimKeylessConnectResponse | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const hasAttemptedRef = useRef(false);

  const tokenOk = Boolean(token);

  const handleClaim = useCallback(async () => {
    if (!token || hasAttemptedRef.current) {
      return;
    }

    hasAttemptedRef.current = true;
    setIsClaiming(true);
    setClaimError(null);
    try {
      const result = await claimKeylessConnect(token);
      clearPendingConnectClaim();
      setClaimResult(result);
      setDidClaim(true);
    } catch (error) {
      console.error('Connect claim failed', error);
      showErrorToast(CLAIM_FAILED_MESSAGE, 'Claim failed');
      setClaimError(CLAIM_FAILED_MESSAGE);
    } finally {
      setIsClaiming(false);
    }
  }, [token]);

  const handleRetry = () => {
    hasAttemptedRef.current = false;
    setClaimError(null);
    void handleClaim();
  };

  const handleVisitDashboard = useCallback(() => {
    const devEnvironment =
      environments?.find((env) => env._id === claimResult?.environmentId) ??
      getClaimableDevelopmentEnvironment(environments);
    const environmentSlug = devEnvironment?.slug;

    if (!environmentSlug) {
      navigate(ROUTES.ROOT);

      return;
    }

    if (claimResult?.agentIdentifier) {
      navigate(
        buildRoute(ROUTES.AGENT_DETAILS_TAB, {
          environmentSlug,
          agentIdentifier: encodeURIComponent(claimResult.agentIdentifier),
          agentTab: AGENT_DETAILS_DEFAULT_TAB,
        })
      );

      return;
    }

    navigate(buildRoute(ROUTES.AGENTS, { environmentSlug }));
  }, [claimResult, environments, navigate]);

  const reason = tokenOk ? null : 'This page must be opened from the link in your chat.';
  const setupError = environmentSetupError;
  const canClaim = !reason && !setupError && isEnvironmentReady && !isClaiming && !didClaim && !claimError;

  useEffect(() => {
    if (canClaim && !hasAttemptedRef.current) {
      void handleClaim();
    }
  }, [canClaim, handleClaim]);

  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4 py-8">
      <div className="w-full max-w-[400px] rounded-lg border-[1.5px] border-black/[0.04] bg-gradient-to-b from-white/50 to-white/[0.15] px-6 py-8 shadow-sm backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-[350px] flex-col items-center gap-6">
          <img src="/images/novu-logo-dark.svg" className="w-24" alt="Novu" />

          <div className="flex w-full flex-col items-center gap-3">
            <h1 className="text-label-sm text-text-strong text-center font-medium tracking-[-0.084px]">
              Keep the agent you just built
            </h1>
            <p className="text-label-xs text-text-sub text-center">
              We'll move your agent, its connected channel, and your conversation into your new Development environment.
              The agent picks the conversation back up right where it left off.
            </p>
          </div>

          {reason ? (
            <div className="text-text-sub flex w-full items-start gap-2 rounded-lg border border-dashed border-stroke-soft p-3 text-label-xs">
              <span>{reason}</span>
            </div>
          ) : setupError ? (
            <div className="flex w-full flex-col gap-3">
              <div className="text-text-sub flex w-full items-start gap-2 rounded-lg border border-dashed border-stroke-soft p-3 text-label-xs">
                <span>{setupError}</span>
              </div>
              <button
                type="button"
                className="text-label-xs text-text-strong w-full rounded-lg border border-stroke-soft px-3 py-2 font-medium"
                onClick={() => {
                  setEnvironmentSetupError(null);
                  setIsEnvironmentReady(false);
                }}
              >
                Try again
              </button>
            </div>
          ) : didClaim ? (
            <div className="flex w-full flex-col gap-3">
              <div className="flex w-full items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-label-xs text-green-700">
                <RiCheckLine className="mt-0.5 size-4 shrink-0" />
                <span>
                  Your agent is connected to your account. Head back to your chat — the agent is ready to continue.
                </span>
              </div>
              <Button
                type="button"
                variant="secondary"
                mode="ghost"
                size="xs"
                className="w-full"
                onClick={handleVisitDashboard}
              >
                Visit Dashboard
              </Button>
            </div>
          ) : claimError ? (
            <div className="flex w-full flex-col gap-3">
              <div className="text-text-sub flex w-full items-start gap-2 rounded-lg border border-dashed border-stroke-soft p-3 text-label-xs">
                <span>{claimError}</span>
              </div>
              <button
                type="button"
                className="text-label-xs text-text-strong w-full rounded-lg border border-stroke-soft px-3 py-2 font-medium"
                onClick={handleRetry}
              >
                Try again
              </button>
            </div>
          ) : (
            <div className="text-text-sub flex w-full items-center justify-center gap-2 p-3 text-label-xs">
              <RiLoader4Line className="size-4 shrink-0 animate-spin" />
              <span>Setting up your agent…</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
