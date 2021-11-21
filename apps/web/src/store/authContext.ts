import React from 'react';
import { IUserEntity } from '@notifire/shared';

export type UserContext = {
  token: string | null;
  currentUser: IUserEntity | undefined;
  setToken: (token: string) => void;
  logout: () => void;
};

export const AuthContext = React.createContext<UserContext>({
  token: null,
  currentUser: undefined,
  setToken: undefined as any,
  logout: undefined as any,
});
