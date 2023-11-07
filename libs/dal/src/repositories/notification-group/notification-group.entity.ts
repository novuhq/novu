import type { EnvironmentId } from '../environment';
import type { OrganizationId } from '../organization';
import type { IEntity, TransformEntityToDbModel } from '../../types';

export class NotificationGroupEntity implements IEntity {
  _id: string;

  name: string;

  _environmentId: EnvironmentId;

  _organizationId: OrganizationId;

  _parentId?: string;
}

export type NotificationGroupDBModel = TransformEntityToDbModel<NotificationGroupEntity>;
