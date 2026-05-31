import { MemberRoleEnum, PermissionsEnum } from '@novu/shared';
import { useAuthContext } from './auth.resource';
import { getJwtToken, isJwtValid } from './jwt-manager';
import { useOrganization } from './organization.resource';
import { useUser } from './user.resource';

function denyPermissionCheck(
  _params: { permission: PermissionsEnum } | { role: MemberRoleEnum }
): boolean {
  return false;
}

export function useAuth() {
  const { currentUser } = useAuthContext();
  const { isLoaded: isUserLoaded } = useUser();
  const { organization, isLoaded: isOrgLoaded } = useOrganization() as {
    organization?: { _id?: string; externalOrgId?: string };
    isLoaded: boolean;
  };

  const hasToken = isJwtValid(getJwtToken());
  const isLoaded = isUserLoaded && (hasToken ? isOrgLoaded : true);
  const isSignedIn = !!currentUser;

  return {
    isLoaded,
    isSignedIn,
    userId: currentUser?.externalId,
    orgId: organization?.externalOrgId ?? organization?._id,
    has: denyPermissionCheck,
  };
}
