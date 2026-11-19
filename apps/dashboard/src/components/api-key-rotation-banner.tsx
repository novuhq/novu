import { PermissionsEnum } from '@novu/shared';
import { RiArrowRightSLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import { LinkButton } from '@/components/primitives/button-link';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchApiKeys } from '@/hooks/use-fetch-api-keys';
import { useFetchSubscription } from '@/hooks/use-fetch-subscription';
import { useHasPermission } from '@/hooks/use-has-permission';
import { buildRoute, ROUTES } from '@/utils/routes';

// The layout mounts this on every page, so the keys are not fetched again on each navigation.
const API_KEYS_STALE_TIME_MS = 60 * 1000;

/**
 * Org-wide, non-dismissible notice while the current environment still has a secret key that the API marks as
 * having to be replaced. Shown to members who can see the keys, since they are the ones who can rotate them.
 */
export function ApiKeyRotationBanner() {
  const navigate = useNavigate();
  const has = useHasPermission();
  const canReadApiKeys = has({ permission: PermissionsEnum.API_KEY_READ });
  /*
   * Until the plan loads, the permission check falls back to the free plan, where every member may read the keys.
   * Asking before then would get members without access a 403 and an error toast on every page.
   */
  const { isLoading: isSubscriptionLoading } = useFetchSubscription();
  const { currentEnvironment } = useEnvironment();
  const apiKeysQuery = useFetchApiKeys({
    enabled: canReadApiKeys && !isSubscriptionLoading,
    staleTime: API_KEYS_STALE_TIME_MS,
  });
  const requiresRotation = apiKeysQuery.data?.data?.some((apiKey) => apiKey.requiresRotation) ?? false;
  const environmentSlug = currentEnvironment?.slug;

  if (!canReadApiKeys || !requiresRotation || !currentEnvironment || !environmentSlug) {
    return null;
  }

  return (
    <div className="bg-error-base text-static-white text-label-xs flex shrink-0 flex-wrap items-center justify-center gap-x-3 gap-y-0.5 bg-[linear-gradient(180deg,rgba(255,255,255,0.24)_0%,rgba(255,255,255,0)_100%)] px-3 py-1.5 text-center">
      <span>
        As a security precaution, the {currentEnvironment.name} secret key is being revoked. Generate a new key and
        update your applications now.
      </span>
      <LinkButton
        variant="modifiable"
        size="sm"
        className="text-label-xs text-static-white gap-0.5"
        trailingIcon={RiArrowRightSLine}
        onClick={() => navigate(buildRoute(ROUTES.API_KEYS, { environmentSlug }))}
      >
        Rotate key
      </LinkButton>
    </div>
  );
}
