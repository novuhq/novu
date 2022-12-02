import React, { useCallback, useEffect, useState } from 'react';
import { ISubscriberJwt } from '@novu/shared';
import { useApi } from '../hooks';
import { AuthContext } from './auth.context';

function isBrowser() {
  return typeof window !== 'undefined';
}

export function getToken(): string {
  if (isBrowser()) {
    return localStorage.getItem('widget_user_auth_token') as string;
  }

  return null;
}
export function AuthProvider({ children }: { children: JSX.Element }) {
  const { api } = useApi();
  const [token, setToken] = useState<string | null>(getToken());
  const [user, setUser] = useState<{ _id: string; firstName: string; lastName: string } | null>(null);

  const applyToken = useCallback(
    (newToken: string | null) => {
      if (newToken) {
        setToken(newToken);
        isBrowser() && localStorage.setItem('widget_user_auth_token', newToken);
        api.setAuthorizationToken(newToken);
      } else {
        setToken(null);
        isBrowser() && localStorage.removeItem('widget_user_auth_token');
        api.disposeAuthorizationToken();
      }
    },
    [token, api]
  );

  useEffect(() => {
    if (api && token) {
      applyToken(token);
    }
  }, [token, api, applyToken]);

  const logout = () => {
    applyToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, applyToken, user: user as ISubscriberJwt, setUser, isLoggedIn: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}
