import { useAuth as useClerkAuth } from '@clerk/react';
import type { IEnvironment } from '@novu/shared';
import { EnvironmentTypeEnum } from '@novu/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { RiCheckLine, RiLoader4Line } from 'react-icons/ri';
import { Navigate, useSearchParams } from 'react-router-dom';
import { claimKeylessConnect } from '@/api/connect';
import { ConnectBrandLogo } from '@/components/auth/connect-brand-logo';
import { AuthLayout } from '@/components/auth-layout';
import { PageMeta } from '@/components/page-meta';
import { showErrorToast } from '@/components/primitives/sonner-helpers';
import { IS_HOSTNAME_SPLIT_ENABLED } from '@/config';
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
import { buildPrimarySignUpUrl } from '@/utils/product-auth-urls';
import { ROUTES } from '@/utils/routes';

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
    const signUpBase = IS_HOSTNAME_SPLIT_ENABLED ? buildPrimarySignUpUrl() : ROUTES.SIGN_UP;
    const signUpUrl = appendRedirectUrlParam(signUpBase, redirectUrl);

    if (signUpUrl.startsWith('http')) {
      window.location.replace(signUpUrl);

      return null;
    }

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

function hasClaimableDevelopmentEnvironment(environments?: IEnvironment[]): boolean {
  if (!environments?.length) {
    return false;
  }

  return Boolean(
    environments.find((env) => env.type === EnvironmentTypeEnum.DEV && !env._parentId) ??
      environments.find((env) => !env._parentId)
  );
}

function ConnectClaimContent({ token }: { token: string | null }) {
  const { currentOrganization } = useAuth();
  const novuOrganizationId = currentOrganization?._id;
  const [isEnvironmentReady, setIsEnvironmentReady] = useState(false);
  const { environments } = useFetchEnvironments({
    organizationId: novuOrganizationId || BOOTSTRAP_ORG_CACHE_KEY,
    refetchInterval: isEnvironmentReady ? undefined : 1000,
    showError: false,
  });

  useEffect(() => {
    if (hasClaimableDevelopmentEnvironment(environments)) {
      setIsEnvironmentReady(true);
    }
  }, [environments]);
  const [isClaiming, setIsClaiming] = useState(false);
  const [didClaim, setDidClaim] = useState(false);
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
      await claimKeylessConnect(token);
      clearPendingConnectClaim();
      setDidClaim(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to claim this agent';
      showErrorToast(`Claim failed: ${message}`);
      setClaimError(message);
    } finally {
      setIsClaiming(false);
    }
  }, [token]);

  const handleRetry = () => {
    hasAttemptedRef.current = false;
    setClaimError(null);
    void handleClaim();
  };

  const reason = tokenOk ? null : 'This page must be opened from the link in your chat.';
  const canClaim = !reason && isEnvironmentReady && !isClaiming && !didClaim && !claimError;

  useEffect(() => {
    if (canClaim && !hasAttemptedRef.current) {
      void handleClaim();
    }
  }, [canClaim, handleClaim]);

  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4 py-8">
      <div className="w-full max-w-[400px] rounded-lg border-[1.5px] border-black/[0.04] bg-gradient-to-b from-white/50 to-white/[0.15] px-6 py-8 shadow-sm backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-[350px] flex-col items-center gap-6">
          <ConnectBrandLogo />

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
          ) : didClaim ? (
            <div className="flex w-full items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-label-xs text-green-700">
              <RiCheckLine className="mt-0.5 size-4 shrink-0" />
              <span>
                Your agent is connected to your account. Head back to your chat — the agent is ready to continue.
              </span>
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
