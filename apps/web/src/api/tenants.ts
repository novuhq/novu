import { api } from './api.client';

export function getTenants({ page = 0, limit = 10 } = {}) {
  return api.getFullResponse('/v1/tenants', { page, limit });
}
