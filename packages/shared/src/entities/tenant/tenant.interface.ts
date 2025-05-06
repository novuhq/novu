import { EnvironmentId, OrganizationId, CustomDataType, TenantId } from '../../types';

export interface ITenantEntity {
  _id?: TenantId;

  identifier: string;

  name?: string;

  deleted?: boolean;

  createdAt: string;

  updatedAt: string;

  data?: CustomDataType;

  _environmentId: EnvironmentId;

  _organizationId: OrganizationId;
}
