import { Context, useContext } from 'react';
import { IS_EE_AUTH_ENABLED } from '../../config/index';
import { EnterpriseAuthContext, EnterpriseAuthProvider } from '../../ee/clerk/providers/EnterpriseAuthProvider';
import { useCreateAuthEnterprise } from '../../ee/clerk/providers/useCreateAuthEnterprise';
import { CommunityAuthContext, CommunityAuthProvider } from './CommunityAuthProvider';
import { useCreateAuthCommunity } from '../../auth/useCreateAuthCommunity';

export type AuthContextType = ReturnType<typeof useCreateAuthCommunity | typeof useCreateAuthEnterprise>;

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  if (IS_EE_AUTH_ENABLED) {
    return <EnterpriseAuthProvider>{children}</EnterpriseAuthProvider>;
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  return <CommunityAuthProvider>{children}</CommunityAuthProvider>;
};

export const useAuthContext = () => {
  const context = IS_EE_AUTH_ENABLED ? EnterpriseAuthContext : CommunityAuthContext;
  const value = useContext(context as Context<AuthContextType>);

  if (!value) {
    throw new Error('useAuth must be used within ' + context.displayName);
  }

  return value;
};
