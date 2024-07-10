import { createContext } from 'react';
import { useCreateAuthContextCommunity } from './useCreateAuthContextCommunity';

export const CommunityAuthContext = createContext<ReturnType<typeof useCreateAuthContextCommunity>>({
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

export const CommunityAuthContextProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <CommunityAuthContext.Provider value={useCreateAuthContextCommunity()}>{children}</CommunityAuthContext.Provider>
  );
};
