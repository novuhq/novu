import { TenantIdentifier, TenantCustomData } from '@novu/shared';

export interface ITenants {
  create(tenantIdentifier: TenantIdentifier, data: ITenantPayload);
  update(tenantIdentifier: TenantIdentifier, data: ITenantUpdatePayload);
  delete(tenantIdentifier: TenantIdentifier);
  get(tenantIdentifier: TenantIdentifier);
  list(data: ITenantPaginationPayload);
}

export interface ITenantPayload {
  name: string;
  data?: TenantCustomData;
}

export interface ITenantUpdatePayload {
  identifier?: TenantIdentifier;
  name?: string;
  data?: TenantCustomData;
}

export interface ITenantPaginationPayload {
  page?: number;
  limit?: number;
}
