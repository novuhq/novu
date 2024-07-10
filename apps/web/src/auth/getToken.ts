import { IS_EE_AUTH_ENABLED } from '../config/index';
import { getCookies } from '../utils/utils';
import { LOCAL_STORAGE_AUTH_TOKEN_KEY } from './auth.const';

export function getToken(): string {
  const token = IS_EE_AUTH_ENABLED ? getCookies('__session') : localStorage.getItem(LOCAL_STORAGE_AUTH_TOKEN_KEY);

  if (!token) {
    throw new Error('No auth token found');
  }

  return token;
}
