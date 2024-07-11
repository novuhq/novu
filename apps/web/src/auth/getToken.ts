import { IS_EE_AUTH_ENABLED } from '../config/index';
import { eeAuthTokenCookie } from '../utils/cookies';
import { LOCAL_STORAGE_AUTH_TOKEN_KEY } from './auth.const';

export function getToken(): string {
  console.log(IS_EE_AUTH_ENABLED);

  const token = IS_EE_AUTH_ENABLED ? eeAuthTokenCookie.get() : localStorage.getItem(LOCAL_STORAGE_AUTH_TOKEN_KEY);

  return token || '';
}
