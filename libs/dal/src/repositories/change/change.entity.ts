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
}

export enum ChangeEntityTypeEnum {
  NOTIFICATION_TEMPLATE = 'NotificationTemplate',
  MESSAGE_TEMPLATE = 'MessageTemplate',
}
