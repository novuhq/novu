import { FeatureFlagsKeysEnum, IEnvironment, WorkflowResponseDto } from '@novu/shared';
import { useQuery } from '@tanstack/react-query';
import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { discoverStatelessWorkflows, getStatelessBridgeStatus } from '@/api/stateless-bridge';
import { useAuth } from '@/context/auth/hooks';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import {
  buildLocalBridgeUrl,
  clearLocalBridgeSession,
  loadLocalBridgeSession,
  LocalBridgeSession,
  saveLocalBridgeSession,
} from '@/utils/local-bridge';
import { QueryKeys } from '@/utils/query-keys';
import { ConnectionStatus } from '@/utils/types';

const HEALTH_REFRESH_INTERVAL_MS = 10 * 1000;
const DISCOVER_REFRESH_INTERVAL_MS = 10 * 1000;

/** workflowId → stepId → control values overridden in the sandbox. */
export type LocalControlOverrides = Record<string, Record<string, Record<string, unknown>>>;

export type LocalModeContextValue = {
  /** Whether the feature is enabled and a handshaked session exists in this browser. */
  isEnabled: boolean;
  /** Whether the current route is inside the Local pseudo-environment (/env/:slug/local/*). */
  isLocalRoute: boolean;
  session: LocalBridgeSession | null;
  bridgeUrl: string | null;
  healthStatus: ConnectionStatus;
  workflows: WorkflowResponseDto[] | undefined;
  isDiscoverPending: boolean;
  discoverError: unknown;
  refetchDiscover: () => Promise<unknown>;
  saveSession: (session: LocalBridgeSession) => void;
  clearSession: () => void;
  /**
   * Sandbox-edited control values. Virtual workflows have nothing to persist
   * to, so "override code defined defaults" edits live here for the session
   * and are sent with previews (via the form) and test triggers (as stateless
   * `controls` on the trigger event).
   */
  controlOverrides: LocalControlOverrides;
  setStepControlOverrides: (workflowId: string, stepId: string, values: Record<string, unknown>) => void;
};

const inactiveContext: LocalModeContextValue = {
  isEnabled: false,
  isLocalRoute: false,
  session: null,
  bridgeUrl: null,
  healthStatus: ConnectionStatus.DISCONNECTED,
  workflows: undefined,
  isDiscoverPending: false,
  discoverError: null,
  refetchDiscover: async () => undefined,
  saveSession: () => undefined,
  clearSession: () => undefined,
  controlOverrides: {},
  setStepControlOverrides: () => undefined,
};

const LocalModeContext = createContext<LocalModeContextValue>(inactiveContext);

export function isLocalModePathname(pathname: string): boolean {
  return /^\/env\/[^/]+\/local(\/|$)/.test(pathname);
}

export const LocalModeProvider = ({ children }: { children: ReactNode }) => {
  const isLocalEnvironmentEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_LOCAL_ENVIRONMENT_ENABLED, false);
  const { currentOrganization } = useAuth();
  const { pathname } = useLocation();
  const organizationId = currentOrganization?._id;

  const [session, setSession] = useState<LocalBridgeSession | null>(() => loadLocalBridgeSession(organizationId));
  const [loadedForOrganizationId, setLoadedForOrganizationId] = useState(organizationId);

  // Re-read the persisted session when the organization changes (org switcher).
  if (organizationId !== loadedForOrganizationId) {
    setLoadedForOrganizationId(organizationId);
    setSession(loadLocalBridgeSession(organizationId));
  }

  const isLocalRoute = isLocalModePathname(pathname);
  const bridgeUrl = session ? buildLocalBridgeUrl(session) : null;
  const hasSession = isLocalEnvironmentEnabled && Boolean(session) && Boolean(bridgeUrl);

  const healthQuery = useQuery({
    queryKey: [QueryKeys.localBridgeHealth, session?.environmentId, bridgeUrl],
    queryFn: () =>
      getStatelessBridgeStatus({
        // The api client only reads `_id` (for the Novu-Environment-Id header).
        environment: { _id: session!.environmentId } as IEnvironment,
        bridgeUrl: bridgeUrl!,
      }),
    enabled: hasSession,
    networkMode: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: HEALTH_REFRESH_INTERVAL_MS,
    retry: false,
    meta: { showError: false },
  });

  const isOnline = healthQuery.isSuccess && healthQuery.data?.status === 'ok';

  const discoverQuery = useQuery({
    queryKey: [QueryKeys.localDiscover, session?.environmentId, bridgeUrl],
    queryFn: () =>
      discoverStatelessWorkflows({
        environment: { _id: session!.environmentId } as IEnvironment,
        bridgeUrl: bridgeUrl!,
      }),
    // Only poll discover while the user is actually inside local mode.
    enabled: hasSession && isLocalRoute,
    networkMode: 'always',
    refetchInterval: DISCOVER_REFRESH_INTERVAL_MS,
    // Editing code and tabbing back to the dashboard should reflect the
    // change immediately, without waiting for the next poll tick.
    refetchOnWindowFocus: true,
    placeholderData: (previous) => previous,
    retry: false,
    meta: { showError: false },
  });

  const [controlOverrides, setControlOverrides] = useState<LocalControlOverrides>({});

  const setStepControlOverrides = useCallback(
    (workflowId: string, stepId: string, values: Record<string, unknown>) => {
      setControlOverrides((previous) => ({
        ...previous,
        [workflowId]: { ...previous[workflowId], [stepId]: values },
      }));
    },
    []
  );

  const saveSession = useCallback(
    (newSession: LocalBridgeSession) => {
      if (!organizationId) return;
      saveLocalBridgeSession(organizationId, newSession);
      setSession(newSession);
    },
    [organizationId]
  );

  const clearSession = useCallback(() => {
    if (!organizationId) return;
    clearLocalBridgeSession(organizationId);
    setSession(null);
    setControlOverrides({});
  }, [organizationId]);

  const healthStatus = useMemo<ConnectionStatus>(() => {
    if (!hasSession) return ConnectionStatus.DISCONNECTED;
    if (healthQuery.isLoading) return ConnectionStatus.LOADING;

    return isOnline ? ConnectionStatus.CONNECTED : ConnectionStatus.DISCONNECTED;
  }, [hasSession, healthQuery.isLoading, isOnline]);

  const value = useMemo<LocalModeContextValue>(() => {
    if (!isLocalEnvironmentEnabled) {
      return inactiveContext;
    }

    return {
      isEnabled: hasSession,
      isLocalRoute: hasSession && isLocalRoute,
      session,
      bridgeUrl,
      healthStatus,
      workflows: discoverQuery.data?.workflows,
      isDiscoverPending: discoverQuery.isPending,
      discoverError: discoverQuery.error,
      refetchDiscover: discoverQuery.refetch,
      saveSession,
      clearSession,
      controlOverrides,
      setStepControlOverrides,
    };
  }, [
    isLocalEnvironmentEnabled,
    hasSession,
    isLocalRoute,
    session,
    bridgeUrl,
    healthStatus,
    discoverQuery.data?.workflows,
    discoverQuery.isPending,
    discoverQuery.error,
    discoverQuery.refetch,
    saveSession,
    clearSession,
    controlOverrides,
    setStepControlOverrides,
  ]);

  return <LocalModeContext.Provider value={value}>{children}</LocalModeContext.Provider>;
};

/**
 * Safe to call anywhere: returns the inactive context when no provider is
 * mounted (e.g. outside the dashboard shell), so shared hooks can branch on
 * `isLocalRoute` without ceremony.
 */
export const useLocalMode = () => useContext(LocalModeContext);
