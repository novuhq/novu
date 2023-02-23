import { Types } from 'mongoose';

import type { EnvironmentId } from '../environment';
import type { OrganizationId } from '../organization';

export class NotificationGroupEntity {
  _id: string;

  name: string;

  _environmentId: EnvironmentId;

  _organizationId: OrganizationId;

  _parentId?: string;
}

export type NotificationGroupDBModel = Omit<
  NotificationGroupEntity,
  '_environmentId' | '_organizationId' | '_parentId'
> & {
  _environmentId: Types.ObjectId;

  _organizationId: Types.ObjectId;

  _parentId: Types.ObjectId;
};
