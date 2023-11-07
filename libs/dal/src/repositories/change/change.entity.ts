import { ChangeEntityTypeEnum } from '@novu/shared';
import type { EnvironmentId } from '../environment';
import type { OrganizationId } from '../organization';
import type { IEntity, TransformEntityToDbModel } from '../../types';

export class ChangeEntity implements IEntity {
  _id: string;

  _creatorId: string;

  _environmentId: EnvironmentId;

  _organizationId: OrganizationId;

  _entityId: string;

  enabled: boolean;

  type: ChangeEntityTypeEnum;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  change: any;

  createdAt: string;

  _parentId?: string;
}

export type ChangeDBModel = TransformEntityToDbModel<ChangeEntity>;
