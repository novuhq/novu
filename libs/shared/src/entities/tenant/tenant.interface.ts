import { EnvironmentId, TenantCustomData, TenantId } from '../../types';

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
