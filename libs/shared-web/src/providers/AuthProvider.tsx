import React, { useContext } from 'react';
import { IOrganizationEntity, IUserEntity, IJwtPayload } from '@novu/shared';
import { useAuthController, useFeatureFlags } from '../hooks';

type UserContext = {
  token: string | null;
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
  const { token, setToken, user, organization, isUserLoading, logout, jwtPayload, organizations } = useAuthController();
  useFeatureFlags(organization);

  return (
    <AuthContext.Provider
      value={{
        currentUser: user,
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
