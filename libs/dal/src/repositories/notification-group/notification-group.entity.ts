import type { EnvironmentId } from '../environment';
import type { OrganizationId } from '../organization';
import type { TransformEntityToDbModel } from '../../types/helpers';

export class NotificationGroupEntity {
  _id: string;

  name: string;

  _environmentId: EnvironmentId;

  _organizationId: OrganizationId;

  _parentId?: string;
}

export type NotificationGroupDBModel = TransformEntityToDbModel<NotificationGroupEntity>;
