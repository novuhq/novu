import { useClerk, useAuth as useClerkAuth, useUser } from '@clerk/react';
import { FeatureFlagsKeysEnum, PermissionsEnum } from '@novu/shared';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RiArrowRightSLine, RiCheckLine, RiCommandLine, RiLockLine } from 'react-icons/ri';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { approveCliDeviceSession } from '@/api/cli-auth';
import { ConnectBrandLogo } from '@/components/auth/connect-brand-logo';
import { AuthLayout } from '@/components/auth-layout';
import { PageMeta } from '@/components/page-meta';
import { Button } from '@/components/primitives/button';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { EnvironmentProvider } from '@/context/environment/environment-provider';
import { useEnvironment } from '@/context/environment/hooks';
import { useSegment } from '@/context/segment';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useFetchApiKeys } from '@/hooks/use-fetch-api-keys';
import { useHasPermission } from '@/hooks/use-has-permission';
import { useTelemetry } from '@/hooks/use-telemetry';
import { clearPendingCliAuth, storePendingCliAuth } from '@/utils/cli-auth-pending';
import {
  persistCliOnboardingSessionId,
  readActiveCliOnboardingSessionId,
} from '@/utils/cli-onboarding-identity';
import { clearConnectProvisioning } from '@/utils/connect';
import { buildAfterSignOutUrl } from '@/utils/cross-product-sign-out';
import { readOnboardingSessionId } from '@/utils/onboarding-session-id';
import { buildRoute, ROUTES } from '@/utils/routes';
import { TelemetryEvent } from '@/utils/telemetry';

function isValidDeviceCode(deviceCode: string | null): deviceCode is string {
  if (!deviceCode) return false;

  return /^[A-Za-z0-9_-]{16,128}$/.test(deviceCode);
}

export const CliAuthPage = () => {
  const { isLoaded, isSignedIn } = useClerkAuth();
  const [searchParams] = useSearchParams();
  const segment = useSegment();
  const deviceCode = searchParams.get('device_code');
  const callerName = searchParams.get('name');
  const onboardingSessionId = readOnboardingSessionId(searchParams);

  useEffect(() => {
    if (isValidDeviceCode(deviceCode)) {
      storePendingCliAuth(deviceCode, callerName);
    }
  }, [deviceCode, callerName]);

  useEffect(() => {
    if (!onboardingSessionId) return;

    persistCliOnboardingSessionId(onboardingSessionId);
    segment.setAnonymousId(onboardingSessionId);
  }, [onboardingSessionId, segment]);

  useEffect(() => {
    clearConnectProvisioning();
  }, []);

  if (!isLoaded) {
    return null;
  }

  if (!isSignedIn) {
    const search = window.location.search;
    const redirectUrl = `${ROUTES.CLI_AUTH}${search}`;
    const signInUrl = `${ROUTES.SIGN_IN}?redirect_url=${encodeURIComponent(redirectUrl)}`;

    return <Navigate to={signInUrl} replace />;
  }

  return (
    <AuthLayout>
      <EnvironmentProvider>
        <PageMeta title="Authorize Novu CLI" />
        <CliAuthContent />
      </EnvironmentProvider>
    </AuthLayout>
  );
};

function CliAuthContent() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const telemetry = useTelemetry();
  const clerk = useClerk();
  const { user } = useUser();
  const { currentEnvironment, environments, switchEnvironment } = useEnvironment();
  const apiKeysQuery = useFetchApiKeys();
  const has = useHasPermission();
  const isLlmGatewayEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_LLM_GATEWAY_ENABLED);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [didAuthorize, setDidAuthorize] = useState(false);

  const deviceCode = searchParams.get('device_code');
  const callerName = searchParams.get('name');
  const onboardingSessionId = readActiveCliOnboardingSessionId(readOnboardingSessionId(searchParams));
  const deviceCodeOk = isValidDeviceCode(deviceCode);
  const canReadApiKeys = has({ permission: PermissionsEnum.API_KEY_READ });

  const isConnect = callerName === 'novu-connect';
  const callerDisplayName = isConnect ? 'Novu Connect' : 'Novu Wizard';
  const signedInEmail = user?.primaryEmailAddress?.emailAddress;

  const apiKey = apiKeysQuery.data?.data?.[0]?.key;

  const developmentEnvironment = useMemo(() => environments?.find((env) => env.name === 'Development'), [environments]);

  useEffect(() => {
    telemetry(TelemetryEvent.CLI_AUTH_PAGE_VIEWED, {
      callerName: callerName ?? 'unknown',
      isConnect,
      onboardingSessionId,
    });
  }, [callerName, isConnect, onboardingSessionId, telemetry]);

  useEffect(() => {
    if (developmentEnvironment && currentEnvironment?._id !== developmentEnvironment._id) {
      switchEnvironment(developmentEnvironment.slug ?? developmentEnvironment._id);
    }
  }, [developmentEnvironment, currentEnvironment?._id, switchEnvironment]);

  const handleAuthorize = useCallback(async () => {
    if (!deviceCodeOk || !apiKey || !currentEnvironment || !deviceCode) {
      return;
    }

    setIsAuthorizing(true);
    try {
      await approveCliDeviceSession(deviceCode, {
        apiKey,
        environmentId: currentEnvironment._id,
      });

      clearPendingCliAuth();
      setDidAuthorize(true);
      telemetry(TelemetryEvent.CLI_AUTH_APPROVED, {
        callerName: callerName ?? 'unknown',
        isConnect,
        onboardingSessionId,
      });
      showSuccessToast('Novu CLI authorized. You can return to your terminal.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to approve CLI authorization';
      showErrorToast(`Authorization failed: ${message}`);
    } finally {
      setIsAuthorizing(false);
    }
  }, [deviceCodeOk, deviceCode, apiKey, currentEnvironment, callerName, isConnect, onboardingSessionId, telemetry]);

  function handleCancel() {
    telemetry(TelemetryEvent.CLI_AUTH_DENIED, {
      callerName: callerName ?? 'unknown',
      isConnect,
      onboardingSessionId,
      reason: 'cancelled',
    });
    navigate(buildRoute(ROUTES.WORKFLOWS, { environmentSlug: currentEnvironment?.slug ?? 'default' }));
  }

  const handleSignOut = useCallback(async () => {
    const fallbackUrl = buildAfterSignOutUrl();

    try {
      await clerk.signOut({ redirectUrl: fallbackUrl });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Please try again.';
      showErrorToast(`Unable to sign out. ${message}`, 'Sign out failed');
      window.location.assign(fallbackUrl);
    }
  }, [clerk]);

  const isLoading = apiKeysQuery.isLoading || !currentEnvironment;

  const reason = (() => {
    if (!deviceCodeOk) return 'This page must be opened from the Novu CLI.';
    if (!isConnect && !isLlmGatewayEnabled) {
      return `${callerDisplayName} is not enabled for your account yet.`;
    }
    if (!canReadApiKeys) return 'You need the api_key:read permission to authorize the CLI.';
    if (isLoading) return null;
    if (!apiKey) return 'No API key is available in this environment.';

    return null;
  })();

  const canAuthorize = !reason && !isLoading && !!apiKey && !isAuthorizing && !didAuthorize;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Enter') return;
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;

      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (!canAuthorize) return;

      event.preventDefault();
      handleAuthorize();
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canAuthorize, handleAuthorize]);

  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4 py-8">
      <div className="w-full max-w-[400px] rounded-lg border-[1.5px] border-black/[0.04] bg-gradient-to-b from-white/50 to-white/[0.15] px-6 py-8 shadow-sm backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-[350px] flex-col items-center gap-6">
          <CliAuthHeader isConnect={isConnect} callerDisplayName={callerDisplayName} />

          <div className="flex w-full flex-col items-center gap-3">
            <h1 className="text-label-sm text-text-strong text-center font-medium tracking-[-0.084px]">
              {callerDisplayName} would like to access your
              <br />
              account and be able to:
            </h1>
            <ScopeList isConnect={isConnect} />
          </div>

          {reason ? (
            <div className="text-text-sub flex w-full items-start gap-2 rounded-lg border border-dashed border-stroke-soft p-3 text-label-xs">
              <RiLockLine className="mt-0.5 size-4 shrink-0" />
              <span>{reason}</span>
            </div>
          ) : null}

          <AnimatePresence mode="wait" initial={false}>
            {didAuthorize ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: -4, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -4, height: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="w-full overflow-hidden"
              >
                <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-label-xs text-green-700">
                  <motion.span
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, type: 'spring', stiffness: 400, damping: 18 }}
                    className="mt-0.5 inline-flex"
                  >
                    <RiCheckLine className="size-4" />
                  </motion.span>
                  <span>You can close this tab and return to your terminal.</span>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="actions"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4, height: 0, marginTop: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="flex w-full max-w-[300px] flex-col items-center gap-3 overflow-hidden"
              >
                <div className="flex w-full gap-3">
                  <Button
                    variant="secondary"
                    mode="outline"
                    size="xs"
                    className="flex-1"
                    onClick={handleCancel}
                    disabled={isAuthorizing}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="secondary"
                    mode="gradient"
                    size="xs"
                    className="flex-1"
                    trailingIcon={RiArrowRightSLine}
                    onClick={handleAuthorize}
                    disabled={!!reason || isLoading || !apiKey || isAuthorizing}
                    isLoading={isAuthorizing || isLoading}
                  >
                    Authorize
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {signedInEmail ? (
            <p className="text-label-xs text-text-sub text-center">
              <span className="text-[#99a0ae]">Signed in as </span>
              {signedInEmail}
              <span className="mx-1 text-[#99a0ae]">·</span>
              <button
                type="button"
                onClick={handleSignOut}
                className="text-text-strong hover:text-text-sub font-medium transition-colors"
              >
                Sign out
              </button>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CliAuthHeader({ isConnect, callerDisplayName }: { isConnect: boolean; callerDisplayName: string }) {
  if (isConnect) {
    return <ConnectBrandLogo />;
  }

  return (
    <div className="flex items-center gap-2">
      <RiCommandLine className="text-text-sub size-8" />
      <span className="text-label-md text-text-strong font-medium">{callerDisplayName}</span>
    </div>
  );
}

type ScopePart = {
  text: string;
  bold?: boolean;
};

type ScopeItem = {
  parts: ScopePart[];
};

function ScopeList({ isConnect }: { isConnect: boolean }) {
  const scopes: ScopeItem[] = isConnect
    ? [
        {
          parts: [{ text: 'Read', bold: true }, { text: ' your Novu API key for the selected environment' }],
        },
        {
          parts: [
            { text: 'Create', bold: true },
            { text: ' and ' },
            { text: 'manage', bold: true },
            { text: ' agents on your behalf' },
          ],
        },
        {
          parts: [{ text: 'Connect', bold: true }, { text: ' channels to your agent' }],
        },
      ]
    : [
        {
          parts: [{ text: 'Read', bold: true }, { text: ' your Novu API key for the selected environment' }],
        },
        {
          parts: [{ text: 'Trigger', bold: true }, { text: ' workflows on your behalf during the integration' }],
        },
        {
          parts: [
            { text: 'Create', bold: true },
            { text: ' or ' },
            { text: 'update', bold: true },
            { text: ' workflows via Novu MCP' },
          ],
        },
      ];

  return (
    <ul className="flex w-full flex-col px-3 py-2">
      {scopes.map((scope) => (
        <li key={scope.parts.map((part) => part.text).join('')} className="flex min-h-6 items-center gap-2">
          <RiCheckLine className="size-3 shrink-0 text-[#99a0ae]" />
          <ScopeText parts={scope.parts} />
        </li>
      ))}
    </ul>
  );
}

function ScopeText({ parts }: { parts: ScopePart[] }) {
  return (
    <span className="text-label-xs text-text-sub font-medium">
      {parts.map((part) => (
        <ScopeTextPart key={part.text} part={part} />
      ))}
    </span>
  );
}

function ScopeTextPart({ part }: { part: ScopePart }) {
  if (part.bold) {
    return <span className="font-semibold text-[#525866]">{part.text}</span>;
  }

  return <>{part.text}</>;
}
