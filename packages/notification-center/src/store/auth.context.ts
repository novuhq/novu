import React from 'react';
import { ISubscriberJwt } from '@novu/shared';
import { IAuthContext } from '../shared/interfaces';

export const AuthContext = React.createContext<IAuthContext>({
  token: null,
  user: null,
  applyToken: (token: string | null) => {},
  setUser: (user: ISubscriberJwt) => {},
  isLoggedIn: null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any);
