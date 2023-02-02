import type { ApiService } from '@novu/client';

const NOTIFICATION_CENTER_TOKEN_KEY = 'widget_user_auth_token';
const getLocalStorageKey = (appId: string) => `${NOTIFICATION_CENTER_TOKEN_KEY}_${appId}`;
const isBrowser = typeof window !== 'undefined';

export const getToken = (appId: string): string | null => {
  if (isBrowser) {
    const token = localStorage.getItem(NOTIFICATION_CENTER_TOKEN_KEY);
    if (!token) {
      return localStorage.getItem(getLocalStorageKey(appId));
    }
  }

  return null;
};

export const applyToken = ({
  token,
  apiService,
  appId,
}: {
  token?: string | undefined;
  apiService: ApiService;
  appId: string;
}) => {
  if (!appId) {
    return;
  }

  if (!token) {
    token = getToken(appId);
  }

  if (token) {
    isBrowser && localStorage.setItem(getLocalStorageKey(appId), token);
    apiService.setAuthorizationToken(token);
  } else {
    isBrowser && localStorage.removeItem(NOTIFICATION_CENTER_TOKEN_KEY);
    isBrowser && localStorage.removeItem(getLocalStorageKey(appId));
    apiService.disposeAuthorizationToken();
  }
};
