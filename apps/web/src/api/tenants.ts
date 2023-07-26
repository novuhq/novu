import { api } from './api.client';

export function getTenants() {
  return api.get('/v1/tenants');
}
