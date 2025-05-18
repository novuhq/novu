import { CheckAuthorizationWithCustomPermissions } from '@clerk/types';
import type { IOrganizationEntity, IUserEntity } from '@novu/shared';

type UserState =
  | {
      isUserLoaded: true;
      currentUser: IUserEntity;
      has: CheckAuthorizationWithCustomPermissions;
    }
  | {
      isUserLoaded: false;
      currentUser: undefined;
      has: undefined;
    };

type OrganizationState =
  | {
      isOrganizationLoaded: true;
      currentOrganization: IOrganizationEntity;
    }
  | {
      isOrganizationLoaded: false;
      currentOrganization: undefined;
    };

export type AuthContextValue = UserState & OrganizationState;
