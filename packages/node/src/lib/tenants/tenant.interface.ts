import { TenantIdentifier, CustomDataType } from '@novu/shared';

export interface ITenants {
  create(tenantIdentifier: TenantIdentifier, data: ITenantPayload);
  update(tenantIdentifier: TenantIdentifier, data: ITenantUpdatePayload);
  delete(tenantIdentifier: TenantIdentifier);
  get(tenantIdentifier: TenantIdentifier);
  list(data: ITenantPaginationPayload);
}

export interface ITenantPayload {
  name: string;
  data?: CustomDataType;
}

export interface ITenantUpdatePayload {
  identifier?: TenantIdentifier;
  name?: string;
  data?: CustomDataType;
}

export interface ITenantPaginationPayload {
  page?: number;
  limit?: number;
}
