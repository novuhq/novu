import type { PermissionsEnum, ServiceAccountScopeEnum } from '@novu/shared';

import type { ChangePropsValueType } from '../../types/helpers';
import type { EnvironmentId } from '../environment';
import type { OrganizationId } from '../organization';

export class ServiceAccountEntity {
  _id: string;

  _organizationId: OrganizationId;

  name: string;

  scope: ServiceAccountScopeEnum;

  _environmentId?: EnvironmentId;

  defaultPermissions: PermissionsEnum[];

  _createdByUserId: string;

  metadata?: Record<string, unknown>;

  createdAt: string;

  updatedAt: string;
}

export type ServiceAccountDBModel = ChangePropsValueType<
  ServiceAccountEntity,
  '_organizationId' | '_environmentId' | '_createdByUserId'
>;
