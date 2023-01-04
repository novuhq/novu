import {
  BuilderFieldOperator,
  BuilderFieldType,
  BuilderGroupValues,
  DigestUnitEnum,
  DigestTypeEnum,
  IPreferenceChannels,
  DelayTypeEnum,
  TemplateVariableTypeEnum,
} from '@novu/shared';
import { MessageTemplateEntity } from '../message-template';
import { NotificationGroupEntity } from '../notification-group';

export class NotificationTemplateEntity {
  _id: string;

  name: string;

  description: string;

  active: boolean;

  draft: boolean;

  preferenceSettings: IPreferenceChannels;

  critical: boolean;

  tags: string[];

  steps: NotificationStepEntity[];

  _organizationId: string;

  _creatorId: string;

  _environmentId: string;

  triggers: NotificationTriggerEntity[];

  _notificationGroupId: string;

  _parentId?: string;

  deleted: boolean;

  deletedAt: string;

  deletedBy: string;

  createdAt?: string;

  updatedAt?: string;

  readonly notificationGroup?: NotificationGroupEntity;

  isBlueprint: boolean;

  blueprintId?: string;
}

export class NotificationTriggerEntity {
  type: 'event';

  identifier: string;

  variables: {
    name: string;
    type: TemplateVariableTypeEnum;
  }[];

  subscriberVariables?: {
    name: string;
  }[];
}

export class NotificationStepEntity {
  _id?: string;

  _templateId: string;

  active?: boolean;

  template?: MessageTemplateEntity;

  filters?: StepFilter[];

  _parentId?: string | null;

  metadata?: {
    amount?: number;
    unit?: DigestUnitEnum;
    digestKey?: string;
    delayPath?: string;
    type: DigestTypeEnum | DelayTypeEnum;
    backoffUnit?: DigestUnitEnum;
    backoffAmount?: number;
    updateMode?: boolean;
  };

  shouldStopOnFail?: boolean;
}

export class StepFilter {
  isNegated: boolean;

  type: BuilderFieldType;

  value: BuilderGroupValues;

  children: {
    field: string;
    value: string;
    operator: BuilderFieldOperator;
    webhookUrl?: string;
    on?: 'payload' | 'subscriber' | 'webhook';
  }[];
}
