import { api } from '@novu/shared';
import { concatApiRoot } from './index';

export async function getUser() {
  return api.get(concatApiRoot('/v1/users/me'));
}
