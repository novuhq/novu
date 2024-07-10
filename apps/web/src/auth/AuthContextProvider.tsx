import { Context, useContext } from 'react';
import { IS_EE_AUTH_ENABLED } from '../config/index';
import { EnterpriseAuthContext, EnterpriseAuthContextProvider } from '../ee/clerk';
import { useCreateAuthContextEnterprise } from '../ee/clerk/';
import { CommunityAuthContext, CommunityAuthContextProvider } from './CommunityAuthContextProvider';
import { useCreateAuthContextCommunity } from './useCreateAuthContextCommunity';

export type AuthContextType = ReturnType<typeof useCreateAuthContextCommunity | typeof useCreateAuthContextEnterprise>;

export const AuthContextProvider = ({ children }: { children: React.ReactNode }) => {
  if (IS_EE_AUTH_ENABLED) {
    return <EnterpriseAuthContextProvider>{children}</EnterpriseAuthContextProvider>;
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  return <CommunityAuthContextProvider>{children}</CommunityAuthContextProvider>;
};

export const useAuthContext = () => {
  const context = IS_EE_AUTH_ENABLED ? EnterpriseAuthContext : CommunityAuthContext;
  const value = useContext(context as Context<AuthContextType>);

  if (!value) {
    throw new Error('useAuth must be used within ' + context.displayName);
  }

  return value;
};
