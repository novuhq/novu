import { ICreateTenantDto, IUpdateTenantDto } from '@novu/shared';
import { api } from './api.client';

export function getTenants({ page = 0, limit = 10 } = {}) {
  return api.getFullResponse('/v1/tenants', { page, limit });
}

export function createTenant(data: ICreateTenantDto) {
  return api.post(`/v1/tenants`, data);
}

export function updateTenant(identifier: string, data: IUpdateTenantDto) {
  return api.patch(`/v1/tenants/${identifier}`, data);
}

export function getTenantByIdentifier(identifier: string) {
  return api.get(`/v1/tenants/${identifier}`);
}
