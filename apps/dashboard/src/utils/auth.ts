import { eeAuthTokenCookie } from './cookies';

export function getToken(): string {
  return eeAuthTokenCookie.get() || '';
}
