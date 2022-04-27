import { ChangeEntityTypeEnum } from '@novu/shared';
export { ChangeEntityTypeEnum };

export class ChangeEntity {
  _id?: string;

  _creatorId: string;

  _environmentId: string;

  _organizationId: string;

  _entityId: string;

  enabled: boolean;

  type: ChangeEntityTypeEnum;

  change: any;

  createdAt: string;

  _parentId?: string;
}
