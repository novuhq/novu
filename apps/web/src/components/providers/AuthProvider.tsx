import { Context, useContext } from 'react';
import { IS_EE_AUTH_ENABLED } from '../../config/index';
import { IOrganizationEntity, IUserEntity } from '@novu/shared';
import { CommunityAuthContext, CommunityAuthProvider } from './CommunityAuthProvider';
import { EnterpriseAuthContext, EnterpriseAuthProvider } from '../../ee/clerk/providers/EnterpriseAuthProvider';

export type AuthContextValue = {
  inPublicRoute: boolean;
  inPrivateRoute: boolean;
  isLoading: boolean;
  currentUser?: IUserEntity | null;
  currentOrganization?: IOrganizationEntity | null;
  organizations?: IOrganizationEntity[] | null;
  login: (newToken: string, redirectUrl?: string) => Promise<void>;
  logout: () => void;
  redirectToLogin: (params: { redirectURL?: string }) => void;
  // TODO: Make redirectToSignUp agnostic to business logic and accept { queryParams: { [key: string]: string }}
  redirectToSignUp: (params: { redirectURL?: string; origin?: string; anonymousId?: string }) => void;
  switchOrganization: (organizationId: string) => Promise<void>;
  reloadOrganization: () => Promise<void>;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  if (IS_EE_AUTH_ENABLED) {
    return <EnterpriseAuthProvider>{children}</EnterpriseAuthProvider>;
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  return <CommunityAuthProvider>{children}</CommunityAuthProvider>;
};

export const useAuth = () => {
  const context = IS_EE_AUTH_ENABLED ? EnterpriseAuthContext : CommunityAuthContext;
  const value = useContext(context);

  if (!value) {
    throw new Error('useAuth must be used within ' + context.displayName);
  }

  return value;
};
