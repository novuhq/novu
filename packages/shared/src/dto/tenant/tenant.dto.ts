import { EnvironmentId, OrganizationId, CustomDataType, TenantId } from '../../types';

export interface ITenantDto {
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
