import { IUserEntity, SignUpOriginEnum } from '@novu/shared';
import { get, post, put } from './api.service';
import { API_AUTH_SIGNUP, API_UPDATE_EMAIL } from '../constants';

export function signup(details: {
  firstName: string;
  lastName?: string;
  email: string;
  password: string;
  origin: SignUpOriginEnum;
}): Promise<{ token: string }> {
  return post(API_AUTH_SIGNUP, details);
}

export function updateEmail(details: { email: string }): Promise<IUserEntity> {
  return put(API_UPDATE_EMAIL, details);
}
