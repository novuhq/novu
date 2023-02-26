import type { ApiService } from '@novu/client';

const NOTIFICATION_CENTER_TOKEN_KEY = 'widget_user_auth_token';
const isBrowser = typeof window !== 'undefined';

export const getToken = (): string | null => {
  if (isBrowser) {
    return localStorage.getItem(NOTIFICATION_CENTER_TOKEN_KEY);
  }

  return null;
};

export const removeToken = (apiService: ApiService) => {
  isBrowser && localStorage.removeItem(NOTIFICATION_CENTER_TOKEN_KEY);
  apiService.disposeAuthorizationToken();
};

export const applyToken = ({ token = getToken(), apiService }: { token?: string | null; apiService: ApiService }) => {
  if (token) {
    isBrowser && localStorage.setItem(NOTIFICATION_CENTER_TOKEN_KEY, token);
    apiService.setAuthorizationToken(token);
  } else {
    removeToken(apiService);
  }
};
