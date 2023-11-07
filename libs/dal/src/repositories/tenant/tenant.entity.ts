import { TenantCustomData } from '@novu/shared';
import { TenantId } from './types';
import { EnvironmentId } from '../environment';
import { OrganizationId } from '../organization';
import type { IEntity, TransformEntityToDbModel } from '../../types';

export class TenantEntity implements IEntity {
  _id: TenantId;

  identifier: string;

  name?: string;

  deleted?: boolean;

  createdAt: string;

  updatedAt: string;

  data?: TenantCustomData;

  _environmentId: EnvironmentId;

  _organizationId: OrganizationId;
}

export type TenantDBModel = TransformEntityToDbModel<TenantEntity>;
