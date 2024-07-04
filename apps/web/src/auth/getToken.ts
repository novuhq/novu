import { LOCAL_STORAGE_AUTH_TOKEN_KEY } from './useCreateAuthContext';

export function getToken(): string {
  return localStorage.getItem(LOCAL_STORAGE_AUTH_TOKEN_KEY) || '';
}
