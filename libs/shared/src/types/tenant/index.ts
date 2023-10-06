import { CustomDataType } from '../shared';

export type TenantCustomData = CustomDataType;

export type TenantIdentifier = string;
export type TenantId = string;

export interface ITenantPayload {
  name?: string;
  data?: TenantCustomData;
}

export interface ITenantDefine extends ITenantPayload {
  identifier: string;
}
