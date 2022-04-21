import { QueryClient, QueryClientProvider } from 'react-query';
import React from 'react';
import { useAuthController } from '../../../store/use-auth-controller';
import { AuthContext } from '../../../store/auth.context';
import { ISubscriberJwt } from '@novu/shared';

export function AuthProvider({ children }: { children: JSX.Element }) {
  const { token, setToken, user, setUser, isLoggedIn } = useAuthController();

  return (
    <AuthContext.Provider value={{ token, setToken, user: user as ISubscriberJwt, setUser, isLoggedIn }}>
      {children}
    </AuthContext.Provider>
  );
}
