import { useEffect, useState } from 'react';
import { useApi } from '../hooks/use-api.hook';

export function getToken(): string {
  return localStorage.getItem('widget_user_auth_token') as string;
}

export function useAuthController() {
  const { api } = useApi();
  const [token, setToken] = useState<string | null>(getToken());
  const [user, setUser] = useState<{ _id: string; firstName: string; lastName: string } | null>(null);

  useEffect(() => {
    const localToken = localStorage.getItem('widget_user_auth_token');

    if (localToken) {
      applyToken(localToken);
    }
  }, []);

  useEffect(() => {
    if (api && token) {
      applyToken(token);
    }
  }, [token, api]);

  const logout = () => {
    applyToken(null);
  };

  function applyToken(newToken: string | null) {
    if (newToken) {
      setToken(newToken);
      localStorage.setItem('widget_user_auth_token', newToken);
      api.setAuthorizationToken(newToken);
    } else {
      setToken(newToken);
      localStorage.removeItem('widget_user_auth_token');
      api.disposeAuthorizationToken();
    }
  }

  return {
    isLoggedIn: !!token,
    user,
    setUser,
    applyToken,
    token,
    logout,
  };
}
