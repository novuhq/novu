import { createContext } from 'react';
import { useCreateAuthCommunity } from '../../auth/useCreateAuthCommunity';

export const CommunityAuthContext = createContext<ReturnType<typeof useCreateAuthCommunity>>({
  inPublicRoute: false,
  inPrivateRoute: false,
  isLoading: false,
  currentUser: undefined,
  organizations: [],
  currentOrganization: undefined,
  login: () => Promise.resolve(),
  logout: () => {},
  environmentId: undefined,
  organizationId: undefined,
  redirectToLogin: () => {},
  redirectToSignUp: () => {},
});
CommunityAuthContext.displayName = 'CommunityAuthProvider';

export const CommunityAuthProvider = ({ children }: { children: React.ReactNode }) => {
  return <CommunityAuthContext.Provider value={useCreateAuthCommunity()}>{children}</CommunityAuthContext.Provider>;
};
