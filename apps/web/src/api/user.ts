import { api } from './api.client';

export async function getUser() {
  return api.get('/v1/users/me');
}
