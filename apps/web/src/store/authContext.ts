import React from 'react';
import { IOrganizationEntity, IUserEntity, IJwtPayload } from '@novu/shared';

export type UserContext = {
  token: string | null;
  currentUser: IUserEntity | undefined;
  currentOrganization: IOrganizationEntity | undefined;
  organizations: IOrganizationEntity[] | undefined;
  setToken: (token: string) => void;
  logout: () => void;
  jwtPayload?: IJwtPayload;
};

export const AuthContext = React.createContext<UserContext>({
  token: null,
  currentUser: undefined,
  setToken: undefined as any,
  logout: undefined as any,
  currentOrganization: undefined as any,
  organizations: undefined as any,
  jwtPayload: undefined,
});
