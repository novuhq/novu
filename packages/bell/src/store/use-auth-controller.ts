import { useEffect, useState } from 'react';
import { useQueryClient } from 'react-query';
import { applyToken } from '../shared/utils/applyToken';

export function getToken(): string {
  return localStorage.getItem('widget_user_auth_token') as string;
}

export function useAuthController() {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(getToken());
  const [user, setUser] = useState<{ _id: string; firstName: string; lastName: string } | null>(null);

  useEffect(() => {
    const localToken = localStorage.getItem('widget_user_auth_token');

    if (localToken) {
      setToken(localToken);
    }
  }, []);

  useEffect(() => {
    applyToken(token);
  }, [token]);

  const logout = () => {
    setToken(null);
    queryClient.clear();
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
