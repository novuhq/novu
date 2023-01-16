import { IEnvironment, SignUpOriginEnum } from '@novu/shared';
import { get, post } from './api.service';
import { API_AUTH_SIGNUP } from '../constants';

export function signup(details: {
  firstName: string;
  lastName?: string;
  email: string;
  password: string;
  origin: SignUpOriginEnum;
}): Promise<{ token: string }> {
  return post(API_AUTH_SIGNUP, details);
}
