import { INotificationGroup, INotificationTrigger, IPreferenceChannels, NotificationStepDto } from '@novu/shared';

export class GetBlueprintResponse {
  _id: string;

  name: string;

  description: string;

  active: boolean;

  draft: boolean;

  preferenceSettings: IPreferenceChannels;

  critical: boolean;

  tags: string[];

  steps: NotificationStepDto[];

  _organizationId: string;

  _creatorId: string;

  _environmentId: string;

  triggers: INotificationTrigger[];

  _notificationGroupId: string;

  _parentId?: string;

  deleted: boolean;

  deletedAt: string;

  deletedBy: string;

  createdAt?: string;

  updatedAt?: string;

  notificationGroup?: INotificationGroup;

  isBlueprint: boolean;

  blueprintId?: string;
}
