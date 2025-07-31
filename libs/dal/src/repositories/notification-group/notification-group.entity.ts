import type { ChangePropsValueType } from '../../types/helpers';
import type { EnvironmentId } from '../environment';
import type { OrganizationId } from '../organization';

export class NotificationGroupEntity {
  _id: string;

  name: string;

  _environmentId: EnvironmentId;

  _organizationId: OrganizationId;

  _parentId?: string;
}

export type NotificationGroupDBModel = ChangePropsValueType<
  NotificationGroupEntity,
  '_environmentId' | '_organizationId' | '_parentId'
>;
