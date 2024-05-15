import React, { useContext } from 'react';
import { IOrganizationEntity, IUserEntity, IJwtPayload } from '@novu/shared';
import { useAuthController } from '../hooks';

export type UserContext = {
  token: string | null;
  isLoggedIn: boolean;
  currentUser: IUserEntity | undefined;
  isUserLoading: boolean;
  currentOrganization: IOrganizationEntity | undefined;
  organizations: IOrganizationEntity[] | undefined;
  setToken: (token: string, refetch?: boolean) => void;
  logout: () => void;
  jwtPayload?: IJwtPayload;
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
  jwtPayload: undefined,
});

export const useAuthContext = (): UserContext => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { token, setToken, user, organization, isUserLoading, logout, jwtPayload, organizations, isLoggedIn } =
    useAuthController();

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
        jwtPayload,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
