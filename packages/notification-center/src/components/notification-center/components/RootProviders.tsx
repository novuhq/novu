import React from 'react';
import { useAuthController } from '../../../store/use-auth-controller';
import { AuthContext } from '../../../store/auth.context';
import { ISubscriberJwt } from '@novu/shared';

export function AuthProvider({ children }: { children: JSX.Element }) {
  const { token, applyToken, user, setUser, isLoggedIn } = useAuthController();

  return (
    <AuthContext.Provider value={{ token, applyToken, user: user as ISubscriberJwt, setUser, isLoggedIn }}>
      {children}
    </AuthContext.Provider>
  );
}
