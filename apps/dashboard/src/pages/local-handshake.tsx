import { EnvironmentTypeEnum, FeatureFlagsKeysEnum, IEnvironment } from '@novu/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { RiPlugLine, RiTerminalBoxLine } from 'react-icons/ri';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { NovuApiError } from '@/api/api.client';
import { BRIDGE_AUTHENTICATION_FAILED_CODE, getStatelessBridgeStatus } from '@/api/stateless-bridge';
import { Button } from '@/components/primitives/button';
import { EnvironmentBranchIcon } from '@/components/primitives/environment-branch-icon';
import { useEnvironment } from '@/context/environment/hooks';
import { useLocalMode } from '@/context/local-mode';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { buildLocalBridgeUrl } from '@/utils/local-bridge';
import { buildRoute, ROUTES } from '@/utils/routes';

const DEVELOPMENT_ENVIRONMENT = 'Development';

type HandshakeState =
  | { phase: 'connecting' }
  | { phase: 'pick-environment'; failedEnvironmentName?: string }
  | { phase: 'error'; message: string }
  | { phase: 'missing-params' };

function isBridgeAuthenticationError(error: unknown): boolean {
  return (
    error instanceof NovuApiError &&
    (error.status === 401 ||
      (error.rawError as { code?: string } | undefined)?.code === BRIDGE_AUTHENTICATION_FAILED_CODE)
  );
}

/**
 * Handshake target opened by `novu dev`: receives the tunnel coordinates as
 * query params, verifies the local bridge accepts requests signed with the
 * selected environment's secret key, persists the session in localStorage and
 * lands in the Local pseudo-environment. An HMAC rejection means the local
 * app's NOVU_SECRET_KEY belongs to a different environment — the user picks
 * the matching one and we retry.
 */
export const LocalHandshakePage = () => {
  const isLocalEnvironmentEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_LOCAL_ENVIRONMENT_ENABLED, false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentEnvironment, environments } = useEnvironment();
  const { saveSession, session } = useLocalMode();
  const [state, setState] = useState<HandshakeState>({ phase: 'connecting' });
  const attemptedRef = useRef(false);

  const tunnelOrigin = searchParams.get('tunnel_origin') ?? '';
  const route = searchParams.get('route') ?? '';

  const developmentEnvironments = (environments ?? []).filter((env) => env.type === EnvironmentTypeEnum.DEV);

  const connect = useCallback(
    async (environment: IEnvironment) => {
      setState({ phase: 'connecting' });
      const bridgeUrl = buildLocalBridgeUrl({ tunnelOrigin, route });

      try {
        await getStatelessBridgeStatus({ environment, bridgeUrl });

        saveSession({
          environmentId: environment._id,
          environmentSlug: environment.slug ?? '',
          tunnelOrigin,
          route,
          connectedAt: new Date().toISOString(),
          lastHealthyAt: new Date().toISOString(),
        });

        void navigate(buildRoute(ROUTES.LOCAL_WORKFLOWS, { environmentSlug: environment.slug ?? '' }), {
          replace: true,
        });
      } catch (error) {
        if (isBridgeAuthenticationError(error)) {
          setState({ phase: 'pick-environment', failedEnvironmentName: environment.name });
        } else {
          setState({
            phase: 'error',
            message: error instanceof Error ? error.message : 'Could not reach the local bridge.',
          });
        }
      }
    },
    [tunnelOrigin, route, saveSession, navigate]
  );

  useEffect(() => {
    if (!isLocalEnvironmentEnabled || attemptedRef.current) return;
    if (!environments || !currentEnvironment) return;

    if (!tunnelOrigin) {
      // No params: deep-link back into an existing session, or show instructions.
      if (session) {
        void navigate(buildRoute(ROUTES.LOCAL_WORKFLOWS, { environmentSlug: session.environmentSlug }), {
          replace: true,
        });
      } else {
        setState({ phase: 'missing-params' });
      }

      attemptedRef.current = true;

      return;
    }

    attemptedRef.current = true;

    const candidate =
      currentEnvironment.type === EnvironmentTypeEnum.DEV
        ? currentEnvironment
        : (environments.find((env) => env.name === DEVELOPMENT_ENVIRONMENT && env.type === EnvironmentTypeEnum.DEV) ??
          environments.find((env) => env.type === EnvironmentTypeEnum.DEV));

    if (!candidate) {
      setState({ phase: 'error', message: 'No development environment found in this organization.' });
      return;
    }

    void connect(candidate);
  }, [isLocalEnvironmentEnabled, environments, currentEnvironment, tunnelOrigin, session, navigate, connect]);

  if (!isLocalEnvironmentEnabled) {
    return <Navigate to={ROUTES.ROOT} replace />;
  }

  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex w-[420px] flex-col items-center gap-4 rounded-xl border p-8 text-center shadow-sm">
        {state.phase === 'connecting' && (
          <>
            <RiPlugLine className="text-foreground-600 size-8 animate-pulse" />
            <span className="text-foreground-900 text-sm font-medium">Connecting to your local bridge…</span>
            <span className="text-foreground-400 max-w-full truncate font-mono text-xs">{tunnelOrigin}</span>
          </>
        )}

        {state.phase === 'pick-environment' && (
          <>
            <RiPlugLine className="text-warning size-8" />
            <span className="text-foreground-900 text-sm font-medium">Pick the matching environment</span>
            <span className="text-foreground-600 text-xs">
              Your app's <code className="bg-neutral-alpha-100 rounded px-1 py-0.5">NOVU_SECRET_KEY</code> belongs to a
              different environment
              {state.failedEnvironmentName ? ` than “${state.failedEnvironmentName}”` : ''}. Select the environment
              whose key your app uses:
            </span>
            <div className="flex w-full flex-col gap-2">
              {developmentEnvironments.map((environment) => (
                <Button
                  key={environment._id}
                  variant="secondary"
                  mode="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => void connect(environment)}
                >
                  <EnvironmentBranchIcon size="sm" environment={environment} />
                  {environment.name}
                </Button>
              ))}
            </div>
          </>
        )}

        {state.phase === 'error' && (
          <>
            <RiTerminalBoxLine className="text-destructive size-8" />
            <span className="text-foreground-900 text-sm font-medium">Could not connect to the local bridge</span>
            <span className="text-foreground-600 break-words text-xs">{state.message}</span>
            <span className="text-foreground-600 text-xs">
              Make sure your app is running and retry with{' '}
              <code className="bg-neutral-alpha-100 rounded px-1 py-0.5">npx novu dev</code>.
            </span>
          </>
        )}

        {state.phase === 'missing-params' && (
          <>
            <RiTerminalBoxLine className="text-foreground-600 size-8" />
            <span className="text-foreground-900 text-sm font-medium">Start a local session</span>
            <span className="text-foreground-600 text-xs">
              Run <code className="bg-neutral-alpha-100 rounded px-1 py-0.5">npx novu dev</code> in your app to preview
              your code-first workflows here.
            </span>
          </>
        )}
      </div>
    </div>
  );
};
