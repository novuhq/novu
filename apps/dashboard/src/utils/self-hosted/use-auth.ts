import { MemberRoleEnum, PermissionsEnum } from '@novu/shared';
import { useAuthContext } from './auth.resource';
import { getJwtToken, isJwtValid } from './jwt-manager';
import { useOrganization } from './organization.resource';
import { useUser } from './user.resource';

export function useAuth() {
  const { currentUser, has } = useAuthContext();
  const { user, isLoaded: isUserLoaded } = useUser();
  const { organization, isLoaded: isOrgLoaded } = useOrganization() as {
    organization?: { _id?: string; externalOrgId?: string };
    isLoaded: boolean;
  };

  const hasToken = isJwtValid(getJwtToken());
  const isLoaded = isUserLoaded && (hasToken ? isOrgLoaded : true);
  const isSignedIn = !!currentUser || !!user;

  return {
    isLoaded,
    isSignedIn,
    userId: currentUser?.externalId ?? user?.externalId,
    orgId: organization?.externalOrgId ?? organization?._id,
    has: has as (params: { permission: PermissionsEnum } | { role: MemberRoleEnum }) => boolean,
  };
}
