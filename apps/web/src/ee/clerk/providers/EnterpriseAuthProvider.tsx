import { createContext } from 'react';
import { useCreateAuthEnterprise } from './useCreateAuthEnterprise';

export const EnterpriseAuthContext = createContext<ReturnType<typeof useCreateAuthEnterprise>>({
  inPublicRoute: undefined,
  inPrivateRoute: false,
  isLoading: false,
  currentUser: undefined,
  organizations: [],
  currentOrganization: undefined,
  session: undefined,
  logout: () => {},
  login: (...args: any[]) => {},
  redirectToLogin: () => {},
  redirectToSignUp: () => {},
  environmentId: undefined,
  organizationId: undefined,
});
EnterpriseAuthContext.displayName = 'EnterpriseAuthProvider';

export const EnterpriseAuthProvider = ({ children }: { children: React.ReactNode }) => {
  return <EnterpriseAuthContext.Provider value={useCreateAuthEnterprise()}>{children}</EnterpriseAuthContext.Provider>;
};
