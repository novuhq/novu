import { useContext } from 'react';
import { IOrganizationEntity, IUserEntity, IJwtClaims } from '@novu/shared';
import jwtDecode from 'jwt-decode';
import { IS_EE_AUTH_ENABLED } from '../../config/index';
import { eeAuthTokenCookie } from '../../utils/cookies';
import {
  CommunityAuthContext,
  CommunityAuthProvider,
  getToken as getCommunityAuthToken,
} from './CommunityAuthProvider';
import { EnterpriseAuthContext, EnterpriseAuthProvider } from '../../ee/clerk/providers/EnterpriseAuthProvider';

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
    reloadOrganization: () => Promise<{}>;
  };

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  if (IS_EE_AUTH_ENABLED) {
    return <EnterpriseAuthProvider>{children}</EnterpriseAuthProvider>;
  }

  return <CommunityAuthProvider>{children}</CommunityAuthProvider>;
};

export const useAuth = () => {
  const context = IS_EE_AUTH_ENABLED ? EnterpriseAuthContext : CommunityAuthContext;
  const value = useContext(context);

  if (!value) {
    throw new Error(`useAuth must be used within ${context.displayName}`);
  }

  return value;
};

export function getToken(): string {
  const token = IS_EE_AUTH_ENABLED ? eeAuthTokenCookie.get() : getCommunityAuthToken();

  return token || '';
}

export function getTokenClaims(): IJwtClaims | null {
  const token = getToken();

  return token ? jwtDecode<IJwtClaims>(token) : null;
}
