import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from 'react-query';

export function applyToken(token: string | null) {
  if (token) {
    localStorage.setItem('widget_user_auth_token', token);
    axios.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    localStorage.removeItem('widget_user_auth_token');
    delete axios.defaults.headers.common.Authorization;
  }
}

export function getToken(): string {
  return localStorage.getItem('widget_user_auth_token') as string;
}

export function useAuthController() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
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
    navigate('/auth/login');
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
