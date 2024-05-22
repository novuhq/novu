import React, { PropsWithChildren, useContext } from 'react';
import { IOrganizationEntity } from '@novu/shared';
import { IUserWithContext, useAuthController } from '../hooks';

export type UserContext = {
  token: string | null;
  isLoggedIn: boolean;
  currentUser: IUserWithContext | undefined;
  isUserLoading: boolean;
  currentOrganization: IOrganizationEntity | undefined;
  organizations: IOrganizationEntity[] | undefined;
  setToken: (token: string, refetch?: boolean) => void;
  logout: () => void;
};

const AuthContext = React.createContext<UserContext>({
  token: null,
  isLoggedIn: false,
  currentUser: undefined,
  isUserLoading: true,
  setToken: undefined as any,
  logout: undefined as any,
  currentOrganization: undefined as any,
  organizations: undefined as any,
});

export const useAuthContext = (): UserContext => useContext(AuthContext);

export interface AuthProviderProps {
  /** Renders when User is loading */
  fallbackComponent: React.ReactNode;
}

export const AuthProvider: React.FC<PropsWithChildren<AuthProviderProps>> = ({ children, fallbackComponent }) => {
  const { token, setToken, user, organization, isUserLoading, logout, organizations, isLoggedIn } = useAuthController();

  if (isUserLoading) {
    return <>{fallbackComponent}</>;
  }

  return (
    <AuthContext.Provider
      value={{
        currentUser: user,
        isLoggedIn,
        isUserLoading,
        currentOrganization: organization,
        organizations,
        token,
        logout,
        setToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
