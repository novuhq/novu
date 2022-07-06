import { ChangeEntityTypeEnum } from '@novu/shared';

export class ChangeEntity {
  _id?: string;

  _creatorId: string;

  _environmentId: string;

  _organizationId: string;

  _entityId: string;

  enabled: boolean;

  type: ChangeEntityTypeEnum;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  change: any;

  createdAt: string;

  _parentId?: string;
}
