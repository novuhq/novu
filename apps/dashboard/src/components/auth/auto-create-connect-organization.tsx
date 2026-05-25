import { useOrganization, useOrganizationList, useUser } from '@clerk/clerk-react';
import { FeatureFlagsKeysEnum, OrganizationProductTypeEnum, tryReadOrganizationProductType } from '@novu/shared';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/primitives/button';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useTelemetry } from '@/hooks/use-telemetry';
import { APP_IDS } from '@/utils/apps';
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

type Status = 'idle' | 'working' | 'error';

type Resolution = { type: 'switched' | 'created'; organizationId: string; organizationName: string };

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
    userMemberships: { infinite: true },
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

  // Force a fresh fetch on mount so a user arriving after delete/leave doesn't see a tombstoned org.
  useEffect(() => {
    if (!isListLoaded || hasRevalidated) return;

    setHasRevalidated(true);
    userMemberships?.revalidate?.();
  }, [isListLoaded, hasRevalidated, userMemberships]);

  useEffect(() => {
    if (!isListLoaded || !userMemberships?.hasNextPage || userMemberships?.isFetching) {
      return;
    }

    userMemberships.fetchNext?.();
  }, [isListLoaded, userMemberships?.hasNextPage, userMemberships?.isFetching, userMemberships]);

  const isCurrentOrgConnect =
    !!user &&
    !!currentOrganization &&
    isActiveConnectWorkspace(currentOrganization.publicMetadata, {
      userId: user.id,
      organizationId: currentOrganization.id,
    });

  const provisionOrganization = useCallback(async (): Promise<Resolution> => {
    const memberships = userMemberships?.data ?? [];
    const nextAction = resolveConnectOrgListAction(memberships);

    if (nextAction.type === 'switch') {
      if (!setActive) {
        throw new Error('Organization switching is not available right now.');
      }

      await setActive({ organization: nextAction.organizationId });

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
  }, [createOrganization, setActive, organizationName, userMemberships?.data, user?.id]);

  const run = useCallback(async () => {
    setStatus('working');
    setErrorMessage(null);

    try {
      const resolution = await provisionOrganization();

      track(TelemetryEvent.CREATE_ORGANIZATION_FORM_SUBMITTED, {
        location: 'web',
        organizationId: resolution.organizationId,
        organizationName: resolution.organizationName,
        product: APP_IDS.CONNECT,
        autoCreated: resolution.type === 'created',
      });

      if (resolution.type === 'created') {
        navigate(getPostOrgCreateRoute(APP_IDS.CONNECT, isAgentsEnabled), { replace: true });

        return;
      }

      clearConnectProvisioning();
      navigate(ROUTES.ENV, { replace: true });
    } catch (error) {
      clearConnectProvisioning();
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to set up your Connect workspace');
    }
  }, [provisionOrganization, track, isAgentsEnabled, navigate]);

  useEffect(() => {
    if (!isUserLoaded || !user) return;
    if (hasStartedRef.current) return;

    if (isCurrentOrgConnect) {
      hasStartedRef.current = true;
      clearConnectProvisioning();
      navigate(ROUTES.ENV, { replace: true });

      return;
    }

    if (!isMembershipListReady || !userMemberships?.data) return;

    const nextAction = resolveConnectOrgListAction(userMemberships.data);

    if (nextAction.type === 'manualCreate') {
      hasStartedRef.current = true;
      clearConnectProvisioning();
      clearConnectAutoCreateSessionGuard();
      setManualMode(true);

      return;
    }

    hasStartedRef.current = true;
    void run();
  }, [isUserLoaded, user, isCurrentOrgConnect, isMembershipListReady, userMemberships?.data, navigate, run]);

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
