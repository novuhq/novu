import { IS_EE_AUTH_ENABLED } from '../../config/index';
import { IOrganizationEntity, IUserEntity } from '@novu/shared';
import { CommunityAuthCtx, CommunityAuthProvider } from './CommunityAuthProvider';
import { EnterpriseAuthCtx, EnterpriseAuthProvider } from '../../ee/clerk/providers/EnterpriseAuthProvider';

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

  return <CommunityAuthProvider>{children}</CommunityAuthProvider>;
};

export const useAuth = () => {
  const context = IS_EE_AUTH_ENABLED ? EnterpriseAuthCtx : CommunityAuthCtx;
  const value = (context as any).value as AuthContextValue;

  if (!value) {
    throw new Error('useAuth must be used within ' + context.displayName);
  }

  return value;
};
