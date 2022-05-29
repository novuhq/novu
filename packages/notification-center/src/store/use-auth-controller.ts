import { useEffect, useState, useCallback } from 'react';
import { useApi } from '../hooks/use-api.hook';

function isBrowser() {
  return typeof window !== 'undefined';
}

export function getToken(): string {
  if (isBrowser()) {
    return localStorage.getItem('widget_user_auth_token') as string;
  }

  return null;
}

export function useAuthController() {
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

  return {
    isLoggedIn: !!token,
    user,
    setUser,
    applyToken,
    token,
    logout,
  };
}
