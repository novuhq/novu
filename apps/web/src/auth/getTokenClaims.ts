import { IJwtClaims } from '@novu/shared';
import jwtDecode from 'jwt-decode';
import { getToken } from './getToken';

export function getTokenClaims(): IJwtClaims | null {
  const token = getToken();

  return token ? jwtDecode<IJwtClaims>(token) : null;
}
