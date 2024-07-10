import { ClerkProvider } from '@clerk/clerk-react';
import { dark } from '@clerk/themes';
import { useColorScheme } from '@novu/design-system';
import { createContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { CLERK_PUBLISHABLE_KEY } from '../../../config/index';
import { useCreateAuthContextEnterprise } from './useCreateAuthContextEnterprise';

// TODO: styles of Clerk components will get updated according to custom design
const ClerkModalElement = {
  modalContent: {
    width: '80rem',
    display: 'block',
  },
  cardBox: {
    width: '100%',
  },
  rootBox: {
    width: 'auto',
  },
};

const localization = {
  userProfile: {
    navbar: {
      title: 'Settings',
      description: 'Manage your account settings',
    },
  },
};

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
  const navigate = useNavigate();
  const { colorScheme } = useColorScheme();

  return (
    <ClerkProvider
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
      publishableKey={CLERK_PUBLISHABLE_KEY}
      appearance={{
        baseTheme: colorScheme === 'dark' ? dark : undefined,
        elements: ClerkModalElement,
      }}
      localization={localization}
    >
      <EnterpriseAuthContext.Provider value={useCreateAuthContextEnterprise()}>
        {children}
      </EnterpriseAuthContext.Provider>
    </ClerkProvider>
  );
};
