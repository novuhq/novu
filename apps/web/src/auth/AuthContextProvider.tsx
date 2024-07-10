import { createContext, useContext } from 'react';
import { useCreateAuthContext } from './useCreateAuthContext';

const AuthContext = createContext<ReturnType<typeof useCreateAuthContext>>({
  inPublicRoute: undefined,
  inPrivateRoute: false,
  isLoading: false,
  currentUser: undefined,
  organizations: [],
  currentOrganization: null,
  login: () => Promise.resolve(),
  logout: () => {},
  environmentId: undefined,
  organizationId: undefined,
  redirectToLogin: () => {},
  redirectToSignUp: () => {},
});
AuthContext.displayName = 'AuthProvider';

export const AuthContextProvider = ({ children }: { children: React.ReactNode }) => {
  return <AuthContext.Provider value={useCreateAuthContext()}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error('useAuth must be used within ' + AuthContext.displayName);
  }

  return value;
};
