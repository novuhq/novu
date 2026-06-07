import { useAuth as useClerkAuth } from '@clerk/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { RiCheckLine, RiLoader4Line } from 'react-icons/ri';
import { Navigate, useSearchParams } from 'react-router-dom';
import { claimKeylessConnect } from '@/api/connect';
import { ConnectBrandLogo } from '@/components/auth/connect-brand-logo';
import { AuthLayout } from '@/components/auth-layout';
import { PageMeta } from '@/components/page-meta';
import { showErrorToast } from '@/components/primitives/sonner-helpers';
import { EnvironmentProvider } from '@/context/environment/environment-provider';
import { useEnvironment } from '@/context/environment/hooks';
import { clearConnectProvisioning } from '@/utils/connect';
import {
  clearPendingConnectClaim,
  readPendingConnectClaim,
  storePendingConnectClaim,
} from '@/utils/connect-claim-pending';
import { ROUTES } from '@/utils/routes';

export const ConnectClaimPage = () => {
  const { isLoaded, isSignedIn } = useClerkAuth();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? readPendingConnectClaim();

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
    const signUpUrl = `${ROUTES.SIGN_UP}?redirect_url=${encodeURIComponent(redirectUrl)}`;

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

function ConnectClaimContent({ token }: { token: string | null }) {
  const { areEnvironmentsInitialLoading } = useEnvironment();
  const [isClaiming, setIsClaiming] = useState(false);
  const [didClaim, setDidClaim] = useState(false);
  const hasAttemptedRef = useRef(false);

  const tokenOk = Boolean(token);

  const handleClaim = useCallback(async () => {
    if (!token || hasAttemptedRef.current) {
      return;
    }

    hasAttemptedRef.current = true;
    setIsClaiming(true);
    try {
      await claimKeylessConnect(token);
      clearPendingConnectClaim();
      setDidClaim(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to claim this agent';
      showErrorToast(`Claim failed: ${message}`);
      hasAttemptedRef.current = false;
    } finally {
      setIsClaiming(false);
    }
  }, [token]);

  const reason = tokenOk ? null : 'This page must be opened from the link in your chat.';
  const canClaim = !reason && !areEnvironmentsInitialLoading && !isClaiming && !didClaim;

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
          ) : null}

          {didClaim ? (
            <div className="flex w-full items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-label-xs text-green-700">
              <RiCheckLine className="mt-0.5 size-4 shrink-0" />
              <span>Your agent is connected to your account. Head back to your chat — the agent is ready to continue.</span>
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
