import { useAuth as useClerkAuth } from '@clerk/react';
import { FeatureFlagsKeysEnum, PermissionsEnum } from '@novu/shared';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RiCheckLine, RiCommandLine, RiLockLine } from 'react-icons/ri';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { approveCliDeviceSession } from '@/api/cli-auth';
import { AuthLayout } from '@/components/auth-layout';
import { PageMeta } from '@/components/page-meta';
import { Button } from '@/components/primitives/button';
import { Card, CardContent, CardHeader } from '@/components/primitives/card';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { EnvironmentProvider } from '@/context/environment/environment-provider';
import { useEnvironment } from '@/context/environment/hooks';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useFetchApiKeys } from '@/hooks/use-fetch-api-keys';
import { useHasPermission } from '@/hooks/use-has-permission';
import { clearPendingCliAuth, storePendingCliAuth } from '@/utils/cli-auth-pending';
import { clearConnectProvisioning } from '@/utils/connect';
import { buildRoute, ROUTES } from '@/utils/routes';

function isValidDeviceCode(deviceCode: string | null): deviceCode is string {
  if (!deviceCode) return false;

  return /^[A-Za-z0-9_-]{16,128}$/.test(deviceCode);
}

export const CliAuthPage = () => {
  const { isLoaded, isSignedIn } = useClerkAuth();
  const [searchParams] = useSearchParams();
  const deviceCode = searchParams.get('device_code');
  const callerName = searchParams.get('name');

  useEffect(() => {
    if (isValidDeviceCode(deviceCode)) {
      storePendingCliAuth(deviceCode, callerName);
    }
  }, [deviceCode, callerName]);

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
  const { currentEnvironment, environments, switchEnvironment } = useEnvironment();
  const apiKeysQuery = useFetchApiKeys();
  const has = useHasPermission();
  const isLlmGatewayEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_LLM_GATEWAY_ENABLED);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [didAuthorize, setDidAuthorize] = useState(false);

  const deviceCode = searchParams.get('device_code');
  const callerName = searchParams.get('name');
  const deviceCodeOk = isValidDeviceCode(deviceCode);
  const canReadApiKeys = has({ permission: PermissionsEnum.API_KEY_READ });

  // Two callers today: `novu-wizard` (default) and `novu-connect` (agent
  // provisioning). Each gets its own subtitle + scope copy so the dashboard
  // explains what the user is actually authorizing.
  const isConnect = callerName === 'novu-connect';
  const callerDisplayName = isConnect ? 'Novu Connect' : 'Novu Wizard';
  const callerSubtitle = isConnect
    ? 'to provision your AI agent and connect it to the channels you pick.'
    : 'in order to integrate Novu into your project.';

  const apiKey = apiKeysQuery.data?.data?.[0]?.key;

  const developmentEnvironment = useMemo(() => environments?.find((env) => env.name === 'Development'), [environments]);

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
      showSuccessToast('Novu CLI authorized. You can return to your terminal.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to approve CLI authorization';
      showErrorToast(`Authorization failed: ${message}`);
    } finally {
      setIsAuthorizing(false);
    }
  }, [deviceCodeOk, deviceCode, apiKey, currentEnvironment]);

  function handleCancel() {
    navigate(buildRoute(ROUTES.WORKFLOWS, { environmentSlug: currentEnvironment?.slug ?? 'default' }));
  }

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
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-col items-start gap-2">
          <div className="flex items-center gap-2">
            <RiCommandLine className="text-foreground-600 size-5" />
            <h1 className="text-foreground-900 text-base font-semibold">Authorize Novu CLI</h1>
          </div>
          <p className="text-foreground-600 text-xs">
            {callerDisplayName} is requesting access to your{' '}
            <span className="font-medium">{currentEnvironment?.name ?? '...'}</span> environment {callerSubtitle}
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ScopeList isConnect={isConnect} />
          {reason ? (
            <div className="text-foreground-600 flex items-start gap-2 rounded-md border border-dashed p-3 text-xs">
              <RiLockLine className="mt-[2px] size-4" />
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
                className="overflow-hidden"
              >
                <div className="flex items-start gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-xs text-green-700">
                  <motion.span
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, type: 'spring', stiffness: 400, damping: 18 }}
                    className="mt-[2px] inline-flex"
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
                className="flex items-center justify-end gap-2 overflow-hidden"
              >
                <Button mode="outline" onClick={handleCancel} disabled={isAuthorizing}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAuthorize}
                  disabled={!!reason || isLoading || !apiKey || isAuthorizing}
                  isLoading={isAuthorizing || isLoading}
                >
                  Authorize
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
}

function ScopeList({ isConnect }: { isConnect: boolean }) {
  const scopes = isConnect
    ? [
        'Read your Novu API key for the selected environment',
        'Create and manage agents on your behalf',
        'Connect channels (Slack, Telegram, and more) to your agent',
      ]
    : [
        'Read your Novu API key for the selected environment',
        'Trigger workflows on your behalf during the integration',
        'Create or update workflows via Novu MCP',
      ];

  return (
    <ul className="text-foreground-700 flex flex-col gap-2 text-xs">
      {scopes.map((scope) => (
        <li key={scope} className="flex items-start gap-2">
          <RiCheckLine className="mt-[2px] size-4 text-emerald-600" />
          <span>{scope}</span>
        </li>
      ))}
    </ul>
  );
}
