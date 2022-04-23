import { useContext, useEffect, useState } from 'react';
import { ApiContext, IApiContext } from './api.context';
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
      setToken(localToken);
    }
  }, []);

  useEffect(() => {
    if (api && token) {
      api.setAuthorizationToken(token);
    }
  }, [token, api]);

  const logout = () => {
    setToken(null);
  };

  return {
    isLoggedIn: !!token,
    user,
    setUser,
    setToken,
    token,
    logout,
  };
}
