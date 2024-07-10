import { createContext } from 'react';
import { useCreateAuthContextEnterprise } from './useCreateAuthContextEnterprise';

export const EnterpriseAuthContext = createContext<ReturnType<typeof useCreateAuthContextEnterprise>>({
  inPublicRoute: undefined,
  inPrivateRoute: false,
  isLoading: false,
  currentUser: undefined,
  organizations: [],
  currentOrganization: undefined,
  logout: () => {},
  login: (...args: any[]) => {},
  redirectToLogin: () => {},
  redirectToSignUp: () => {},
  environmentId: undefined,
  organizationId: undefined,
});
EnterpriseAuthContext.displayName = 'EnterpriseAuthProvider';

export const EnterpriseAuthContextProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <EnterpriseAuthContext.Provider value={useCreateAuthContextEnterprise()}>{children}</EnterpriseAuthContext.Provider>
  );
};
