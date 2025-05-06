import { CustomDataType } from './utils';

export type TenantIdentifier = string;
export type TenantId = string;

export interface ITenantPayload {
  name?: string;
  data?: CustomDataType;
}

export interface ITenantDefine extends ITenantPayload {
  identifier: string;
}
