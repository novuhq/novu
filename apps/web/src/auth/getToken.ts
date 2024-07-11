import { LOCAL_STORAGE_AUTH_TOKEN_KEY } from './auth.const';

export function getToken(): string {
  return localStorage.getItem(LOCAL_STORAGE_AUTH_TOKEN_KEY) || '';
}
