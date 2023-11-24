import React, { useContext, useEffect } from 'react';
import { IOrganizationEntity, IUserEntity, IJwtPayload } from '@novu/shared';
import { useAuthController } from '../../hooks';
import { useLDClient } from 'launchdarkly-react-client-sdk';

type UserContext = {
  token: string | null;
  currentUser: IUserEntity | undefined;
  currentOrganization: IOrganizationEntity | undefined;
  organizations: IOrganizationEntity[] | undefined;
  setToken: (token: string, refetch?: boolean) => void;
  logout: () => void;
  jwtPayload?: IJwtPayload;
};

const AuthContext = React.createContext<UserContext>({
  token: null,
  currentUser: undefined,
  setToken: undefined as any,
  logout: undefined as any,
  currentOrganization: undefined as any,
  organizations: undefined as any,
  jwtPayload: undefined,
});

export const useAuthContext = (): UserContext => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { token, setToken, user, organization, logout, jwtPayload, organizations } = useAuthController();
  const ldClient = useLDClient();

  useEffect(() => {
    if (!organization?._id) {
      return;
    }

    ldClient?.identify({
      kind: 'organization',
      key: organization._id,
      name: organization.name,
    });
  }, [organization?._id, ldClient, organization?.name]);

  return (
    <AuthContext.Provider
      value={{
        currentUser: user,
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
