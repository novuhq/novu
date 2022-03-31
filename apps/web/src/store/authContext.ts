import React from 'react';
import { IOrganizationEntity, IUserEntity } from '@novu/shared';

export type UserContext = {
  token: string | null;
  currentUser: IUserEntity | undefined;
  currentOrganization: IOrganizationEntity | undefined;
  setToken: (token: string) => void;
  logout: () => void;
};

export const AuthContext = React.createContext<UserContext>({
  token: null,
  currentUser: undefined,
  setToken: undefined as any,
  logout: undefined as any,
  currentOrganization: undefined as any,
});
