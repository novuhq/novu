import React from 'react';
import { ISubscriberJwt } from '@novu/shared';

export interface IAuthContext {
  setToken: (token: string) => void;
  setUser: (profile: ISubscriberJwt) => void;

  token: string | null;
  user: ISubscriberJwt | null;
  isLoggedIn: boolean;
}

export const AuthContext = React.createContext<IAuthContext>({
  token: null,
  user: null,
  setToken: (token: string) => {},
  setUser: (user: ISubscriberJwt) => {},
  isLoggedIn: null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any);
