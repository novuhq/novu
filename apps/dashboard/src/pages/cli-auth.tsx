import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { FeatureFlagsKeysEnum, PermissionsEnum } from '@novu/shared';
import { useEffect, useMemo, useState } from 'react';
import { RiCheckLine, RiCommandLine, RiLockLine } from 'react-icons/ri';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '@/components/auth-layout';
import { PageMeta } from '@/components/page-meta';
import { Button } from '@/components/primitives/button';
import { Card, CardContent, CardHeader } from '@/components/primitives/card';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { useAuth } from '@/context/auth/hooks';
import { EnvironmentProvider } from '@/context/environment/environment-provider';
import { useEnvironment } from '@/context/environment/hooks';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useFetchApiKeys } from '@/hooks/use-fetch-api-keys';
import { useHasPermission } from '@/hooks/use-has-permission';
import { buildRoute, ROUTES } from '@/utils/routes';

const CALLBACK_HOST_ALLOWLIST = new Set(['127.0.0.1', 'localhost']);

function isLoopbackCallback(callbackUrl: string | null): callbackUrl is string {
  if (!callbackUrl) return false;
  try {
    const url = new URL(callbackUrl);
    if (url.protocol !== 'http:') return false;

    return CALLBACK_HOST_ALLOWLIST.has(url.hostname);
  } catch {
    return false;
  }
}

export const CliAuthPage = () => {
  const { isLoaded, isSignedIn } = useClerkAuth();

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
  const { currentUser } = useAuth();
  const { currentEnvironment, environments, switchEnvironment } = useEnvironment();
  const apiKeysQuery = useFetchApiKeys();
  const has = useHasPermission();
  const isLlmGatewayEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_LLM_GATEWAY_ENABLED);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [didAuthorize, setDidAuthorize] = useState(false);

  const callbackUrl = searchParams.get('cli_callback');
  const cliState = searchParams.get('state');
  const callbackOk = isLoopbackCallback(callbackUrl);
  const canReadApiKeys = has({ permission: PermissionsEnum.API_KEY_READ });

  const apiKey = apiKeysQuery.data?.data?.[0]?.key;

  const developmentEnvironment = useMemo(() => environments?.find((env) => env.name === 'Development'), [environments]);

  useEffect(() => {
    if (developmentEnvironment && currentEnvironment?._id !== developmentEnvironment._id) {
      switchEnvironment(developmentEnvironment.slug ?? developmentEnvironment._id);
    }
  }, [developmentEnvironment, currentEnvironment?._id, switchEnvironment]);

  async function handleAuthorize() {
    if (!callbackOk || !apiKey || !currentEnvironment) {
      return;
    }

    setIsAuthorizing(true);
    try {
      const response = await fetch(callbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: cliState,
          apiKey,
          environmentId: currentEnvironment._id,
          environmentSlug: currentEnvironment.slug ?? null,
          environmentName: currentEnvironment.name,
          organizationId: currentEnvironment._organizationId,
          user: currentUser
            ? {
                id: currentUser._id,
                email: currentUser.email ?? null,
                firstName: currentUser.firstName ?? null,
                lastName: currentUser.lastName ?? null,
              }
            : null,
        }),
      });

      if (!response.ok) {
        throw new Error(`Callback responded with ${response.status}`);
      }

      setDidAuthorize(true);
      showSuccessToast('Novu CLI authorized. You can return to your terminal.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to reach the CLI callback';
      showErrorToast(`Authorization failed: ${message}`);
    } finally {
      setIsAuthorizing(false);
    }
  }

  function handleCancel() {
    navigate(buildRoute(ROUTES.WORKFLOWS, { environmentSlug: currentEnvironment?.slug ?? 'default' }));
  }

  const isLoading = apiKeysQuery.isLoading || !currentEnvironment;

  const reason = (() => {
    if (!callbackOk) return 'This page must be opened from the Novu CLI.';
    if (!isLlmGatewayEnabled) return 'Novu Envoy is not enabled for your account yet.';
    if (!canReadApiKeys) return 'You need the api_key:read permission to authorize the CLI.';
    if (isLoading) return null;
    if (!apiKey) return 'No API key is available in this environment.';

    return null;
  })();

  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-col items-start gap-2">
          <div className="flex items-center gap-2">
            <RiCommandLine className="text-foreground-600 size-5" />
            <h1 className="text-foreground-900 text-base font-semibold">Authorize Novu CLI</h1>
          </div>
          <p className="text-foreground-600 text-xs">
            Novu Envoy is requesting access to your{' '}
            <span className="font-medium">{currentEnvironment?.name ?? '...'}</span> environment in order to integrate
            Novu into your project.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ScopeList />
          {reason ? (
            <div className="text-foreground-600 flex items-start gap-2 rounded-md border border-dashed p-3 text-xs">
              <RiLockLine className="mt-[2px] size-4" />
              <span>{reason}</span>
            </div>
          ) : null}

          {didAuthorize ? (
            <div className="flex items-start gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-xs text-green-700">
              <RiCheckLine className="mt-[2px] size-4" />
              <span>You can close this tab and return to your terminal.</span>
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-2">
            <Button mode="outline" onClick={handleCancel} disabled={isAuthorizing}>
              Cancel
            </Button>
            <Button
              onClick={handleAuthorize}
              disabled={!!reason || isLoading || !apiKey || isAuthorizing || didAuthorize}
              isLoading={isAuthorizing || isLoading}
            >
              {didAuthorize ? 'Authorized' : 'Authorize'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ScopeList() {
  const scopes = [
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
