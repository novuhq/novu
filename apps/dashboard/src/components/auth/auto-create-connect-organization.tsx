import { useOrganization, useOrganizationList, useUser } from '@clerk/react';
import { FeatureFlagsKeysEnum, OrganizationProductTypeEnum, tryReadOrganizationProductType } from '@novu/shared';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type NavigateFunction, useNavigate } from 'react-router-dom';
import { Button } from '@/components/primitives/button';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useTelemetry } from '@/hooks/use-telemetry';
import { APP_IDS } from '@/utils/apps';
import { resolvePendingCliAuthReturnUrl } from '@/utils/cli-auth-pending';
import {
  beginConnectProvisioning,
  buildConnectOrganizationName,
  buildConnectOrganizationSlug,
  clearConnectAutoCreateSessionGuard,
  clearConnectProvisioning,
  isActiveConnectWorkspace,
  isConnectProvisioningActive,
  resolveConnectOrgListAction,
  writeConnectAutoCreateSessionGuard,
} from '@/utils/connect';
import { getPostOrgCreateRoute } from '@/utils/onboarding-redirect';
import { ROUTES } from '@/utils/routes';
import { TelemetryEvent } from '@/utils/telemetry';

// Lazy-loaded to break a circular import with `create-organization`.
const OrganizationCreateLazy = lazy(() =>
  import('@/components/auth/create-organization').then((module) => ({ default: module.default }))
);

const MAX_SLUG_RETRIES = 3;
// Match the picker — bypass Clerk's default 10/page so the membership drain finishes in one
// round trip for virtually every user (Clerk caps at 500).
const MEMBERSHIPS_PAGE_SIZE = 100;

type Status = 'idle' | 'working' | 'error';

type Resolution =
  | { type: 'switched' | 'created'; organizationId: string; organizationName: string }
  | { type: 'manual' };

function isMissingOrganizationError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const errors = (error as { errors?: Array<{ code?: string }> }).errors;
  if (!Array.isArray(errors)) return false;

  return errors.some((entry) => entry?.code === 'organization_not_found' || entry?.code === 'resource_not_found');
}

function isSlugTakenError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const errors = (error as { errors?: Array<{ code?: string; meta?: { paramName?: string } }> }).errors;
  if (!Array.isArray(errors)) return false;

  return errors.some(
    (entry) =>
      entry?.meta?.paramName === 'slug' &&
      (entry.code === 'form_identifier_exists' || entry.code === 'form_param_value_invalid')
  );
}

function navigateToPostConnectOrgResolution(navigate: NavigateFunction, fallbackPath: string) {
  const pendingCliAuthReturnUrl = resolvePendingCliAuthReturnUrl();

  if (pendingCliAuthReturnUrl) {
    // Leave the connect onboarding overlay behind — `/cli/auth` is outside that flow and the
    // full-screen loader would otherwise stay mounted from sessionStorage after auto-provision.
    clearConnectProvisioning();
    window.location.assign(pendingCliAuthReturnUrl);

    return;
  }

  void navigate(fallbackPath, { replace: true });
}

export function AutoCreateConnectOrganization() {
  const navigate = useNavigate();
  const { user, isLoaded: isUserLoaded } = useUser();
  const { organization: currentOrganization } = useOrganization();
  const {
    createOrganization,
    setActive,
    userMemberships,
    isLoaded: isListLoaded,
  } = useOrganizationList({
    userMemberships: { infinite: true, pageSize: MEMBERSHIPS_PAGE_SIZE },
  });
  const isAgentsEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_CONVERSATIONAL_AGENTS_ENABLED, false);
  const track = useTelemetry();

  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [hasRevalidated, setHasRevalidated] = useState(false);
  const hasStartedRef = useRef(false);

  const organizationName = useMemo(() => buildConnectOrganizationName(user?.firstName), [user?.firstName]);

  const isMembershipListReady =
    isListLoaded && hasRevalidated && !userMemberships?.isFetching && userMemberships?.hasNextPage !== true;

  // `userMemberships` is read through a ref so the membership-refresh effect deps stay stable —
  // including it directly causes the effect to re-run every time `revalidate()` flips Clerk's
  // internal `isFetching`, and each cleanup would cancel the in-flight refresh before it could
  // call `setHasRevalidated(true)`.
  const userMembershipsRef = useRef(userMemberships);
  userMembershipsRef.current = userMemberships;

  // Force a fresh fetch on mount so a user arriving after delete/leave doesn't see a tombstoned org.
  // `hasRevalidated` is only flipped after the refetch resolves; flipping it synchronously creates a
  // render window where `isMembershipListReady` reports true while `data` still holds the deleted org,
  // which would then trip `setActive` against an id Clerk no longer knows about.
  useEffect(() => {
    if (!isListLoaded || hasRevalidated) return;

    let cancelled = false;
    const refresh = async () => {
      try {
        await userMembershipsRef.current?.revalidate?.();
      } catch {
        // Revalidation failures shouldn't strand the user — fall through and let the resolver run.
      } finally {
        if (!cancelled) {
          setHasRevalidated(true);
        }
      }
    };

    void refresh();

    return () => {
      cancelled = true;
    };
  }, [isListLoaded, hasRevalidated]);

  useEffect(() => {
    if (!isListLoaded || !userMemberships?.hasNextPage || userMemberships?.isFetching) {
      return;
    }

    userMembershipsRef.current?.fetchNext?.();
  }, [isListLoaded, userMemberships?.hasNextPage, userMemberships?.isFetching]);

  const isCurrentOrgConnect =
    !!user &&
    !!currentOrganization &&
    isActiveConnectWorkspace(currentOrganization.publicMetadata, {
      userId: user.id,
      organizationId: currentOrganization.id,
    });

  const enterManualMode = useCallback(() => {
    clearConnectProvisioning();
    clearConnectAutoCreateSessionGuard();
    setManualMode(true);
  }, []);

  const provisionOrganization = useCallback(async (): Promise<Resolution> => {
    // Read via ref: the main effect already gates on `isMembershipListReady`, so the ref holds
    // the same fresh data the effect saw, and dropping the live dep keeps this callback (and
    // therefore `run`) stable across the `userMemberships` reference rotations that Clerk emits.
    const memberships = userMembershipsRef.current?.data ?? [];
    const nextAction = resolveConnectOrgListAction(memberships);

    if (nextAction.type === 'switch') {
      if (!setActive) {
        throw new Error('Organization switching is not available right now.');
      }

      try {
        await setActive({ organization: nextAction.organizationId });
      } catch (error) {
        // The cached membership was tombstoned (e.g. deleted in another tab). Treat as manual create
        // so we never leave the session pointing at an id Clerk has already removed — otherwise the
        // Connect host's auth guard would bounce the user to Platform's sign-in URL.
        if (isMissingOrganizationError(error)) {
          return { type: 'manual' };
        }

        throw error;
      }

      const switchedMembership = memberships.find(
        (membership) => membership.organization.id === nextAction.organizationId
      );

      if (
        switchedMembership &&
        tryReadOrganizationProductType(switchedMembership.organization.publicMetadata) ===
          OrganizationProductTypeEnum.CONNECT
      ) {
        clearConnectAutoCreateSessionGuard();
      }

      return {
        type: 'switched',
        organizationId: nextAction.organizationId,
        organizationName: nextAction.organizationName,
      };
    }

    if (!createOrganization || !setActive) {
      throw new Error('Organization creation is not available right now.');
    }

    let lastError: unknown = null;
    let createdOrgId: string | null = null;

    // `productType: connect` is written server-side during sync; the session guard bridges that lag.
    for (let attempt = 0; attempt < MAX_SLUG_RETRIES; attempt += 1) {
      try {
        const organization = await createOrganization({
          name: organizationName,
          slug: buildConnectOrganizationSlug(organizationName),
        });
        createdOrgId = organization.id;
        break;
      } catch (error) {
        lastError = error;
        if (!isSlugTakenError(error)) {
          throw error;
        }
      }
    }

    if (!createdOrgId) {
      throw lastError ?? new Error('Failed to create Connect organization');
    }

    if (user?.id) {
      writeConnectAutoCreateSessionGuard(user.id, createdOrgId);
    }

    await setActive({ organization: createdOrgId });

    return { type: 'created', organizationId: createdOrgId, organizationName };
  }, [createOrganization, setActive, organizationName, user?.id]);

  const run = useCallback(async () => {
    setStatus('working');
    setErrorMessage(null);

    try {
      const resolution = await provisionOrganization();

      if (resolution.type === 'manual') {
        setStatus('idle');
        enterManualMode();

        return;
      }

      track(TelemetryEvent.CREATE_ORGANIZATION_FORM_SUBMITTED, {
        location: 'web',
        organizationId: resolution.organizationId,
        organizationName: resolution.organizationName,
        product: APP_IDS.CONNECT,
        autoCreated: resolution.type === 'created',
      });

      if (resolution.type === 'created') {
        navigateToPostConnectOrgResolution(navigate, getPostOrgCreateRoute(APP_IDS.CONNECT, isAgentsEnabled));

        return;
      }

      clearConnectProvisioning();
      navigateToPostConnectOrgResolution(navigate, ROUTES.ENV);
    } catch (error) {
      clearConnectProvisioning();
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to set up your Connect workspace');
    }
  }, [provisionOrganization, enterManualMode, track, isAgentsEnabled, navigate]);

  useEffect(() => {
    if (!isUserLoaded || !user) return;
    if (hasStartedRef.current) return;

    if (isCurrentOrgConnect) {
      hasStartedRef.current = true;
      clearConnectProvisioning();
      navigateToPostConnectOrgResolution(navigate, ROUTES.ENV);

      return;
    }

    if (!isMembershipListReady || !userMemberships?.data) return;

    const nextAction = resolveConnectOrgListAction(userMemberships.data);
    hasStartedRef.current = true;

    if (nextAction.type === 'manualCreate') {
      enterManualMode();

      return;
    }

    void run();
  }, [
    isUserLoaded,
    user,
    isCurrentOrgConnect,
    isMembershipListReady,
    userMemberships?.data,
    navigate,
    run,
    enterManualMode,
  ]);

  const handleRetry = () => {
    hasStartedRef.current = false;
    beginConnectProvisioning();
    void run();
  };

  if (manualMode) {
    return (
      <Suspense fallback={null}>
        <OrganizationCreateLazy />
      </Suspense>
    );
  }

  if (status === 'error' && !isConnectProvisioningActive()) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-label-md text-text-strong font-medium">We couldn&apos;t set up your workspace</p>
        <p className="text-label-sm text-text-sub max-w-sm">{errorMessage}</p>
        <Button variant="primary" onClick={handleRetry}>
          Try again
        </Button>
      </div>
    );
  }

  return null;
}
