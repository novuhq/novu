import type { IOrganizationEntity, IUserEntity } from '@novu/shared';

type UserState =
  | {
      isUserLoaded: true;
      currentUser: IUserEntity;
    }
  | {
      isUserLoaded: false;
      currentUser: undefined;
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

export type AuthContextValue = UserState &
  OrganizationState & {
    login: (newToken: string, redirectUrl?: string) => Promise<void>;
    logout: () => void;
    redirectToLogin: (params: { redirectURL?: string }) => void;
    // TODO: Make redirectToSignUp agnostic to business logic and accept { queryParams: { [key: string]: string }}
    redirectToSignUp: (params: { redirectURL?: string; origin?: string; anonymousId?: string }) => void;
    switchOrganization: (organizationId: string) => Promise<void>;
    reloadOrganization: () => Promise<void>;
  };
