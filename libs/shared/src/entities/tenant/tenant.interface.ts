import { EnvironmentId, TenantCustomData } from '../../types';

export interface ITenantEntity {
  _id?: TenantId;

  identifier: string;

  name?: string;

  deleted?: boolean;

  createdAt: string;

  updatedAt: string;

  data?: TenantCustomData;

  _environmentId: EnvironmentId;
}

export type TenantId = string;
