import { ICreateTenantBodyDto, IUpdateTenantBodyDto } from '@novu/shared';
import { api } from './api.client';

export function getTenants() {
  return api.get('/v1/tenants');
}

export function createTenant(data: ICreateTenantBodyDto) {
  return api.post(`/v1/tenants`, data);
}

export function updateTenant(identifier: string, data: IUpdateTenantBodyDto) {
  return api.patch(`/v1/tenants/${identifier}`, data);
}

export async function getTenantByIdentifier(identifier: string) {
  return api.get(`/v1/tenants/${identifier}`);
}
