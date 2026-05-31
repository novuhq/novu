import { useAuthContext } from './auth.resource';
import { getJwtToken, isJwtValid } from './jwt-manager';
import { useOrganization } from './organization.resource';
import { useUser } from './user.resource';

export function useAuth() {
  const { currentUser, has } = useAuthContext();
  useUser();
  const { organization, isLoaded: isOrgLoaded } = useOrganization() as {
    organization?: { _id?: string; externalOrgId?: string };
    isLoaded: boolean;
  };

  const hasToken = isJwtValid(getJwtToken());
  const isLoaded = hasToken ? isOrgLoaded : true;
  const isSignedIn = !!currentUser;

  return {
    isLoaded,
    isSignedIn,
    userId: currentUser?.externalId,
    orgId: organization?.externalOrgId ?? organization?._id,
    has,
  };
}
