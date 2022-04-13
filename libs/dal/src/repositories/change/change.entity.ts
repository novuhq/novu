export class ChangeEntity {
  _id?: string;

  _creatorId: string;

  _environmentId: string;

  _organizationId: string;

  _entityId: string;

  enabled: boolean;

  type: ChangeEntityType;

  change: any;

  createdAt: string;
}

export enum ChangeEntityType {
  NotificationTemplate = 'NotificationTemplate',
}
