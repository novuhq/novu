import { Schema, Types } from 'mongoose';
import {
  FilterParts,
  BuilderFieldType,
  BuilderGroupValues,
  IPreferenceChannels,
  IWorkflowStepMetadata,
  NotificationTemplateCustomData,
  IStepVariant,
  IMessageFilter,
  INotificationTrigger,
  TriggerTypeEnum,
  INotificationTriggerVariable,
  ITriggerReservedVariable,
  INotificationTemplate,
  INotificationTemplateStep,
  IMessageTemplate,
  NotificationTemplateTypeEnum,
} from '@novu/shared';

import { NotificationGroupEntity } from '../notification-group';
import type { OrganizationId } from '../organization';
import type { EnvironmentId } from '../environment';
import type { ChangePropsValueType } from '../../types';

export class NotificationTemplateEntity implements INotificationTemplate {
  _id: string;

  name: string;

  description: string;

  active: boolean;

  draft: boolean;

  preferenceSettings: IPreferenceChannels;

  critical: boolean;

  tags: string[];

  steps: NotificationStepEntity[];

  _organizationId: OrganizationId;

  _creatorId: string;

  _environmentId: EnvironmentId;

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

  data?: NotificationTemplateCustomData;

  type?: NotificationTemplateTypeEnum;

  rawData?: any;

  payloadSchema?: any;
}

export type NotificationTemplateDBModel = ChangePropsValueType<
  Omit<NotificationTemplateEntity, '_parentId'>,
  '_environmentId' | '_organizationId' | '_creatorId' | '_notificationGroupId'
> & {
  _parentId?: Types.ObjectId;
};

export class NotificationTriggerEntity implements INotificationTrigger {
  type: TriggerTypeEnum;

  identifier: string;

  variables: INotificationTriggerVariable[];

  subscriberVariables?: Pick<INotificationTriggerVariable, 'name'>[];

  reservedVariables?: ITriggerReservedVariable[];
}

export class StepVariantEntity implements IStepVariant {
  _id?: string;

  uuid?: string;

  stepId?: string;

  name?: string;

  _templateId: string;

  active?: boolean;

  replyCallback?: {
    active: boolean;
    url: string;
  };

  template?: IMessageTemplate;

  filters?: StepFilter[];

  _parentId?: string | null;

  metadata?: IWorkflowStepMetadata;

  shouldStopOnFail?: boolean;
}

export class NotificationStepEntity extends StepVariantEntity implements INotificationTemplateStep {
  variants?: StepVariantEntity[];
}

export class StepFilter implements IMessageFilter {
  isNegated?: boolean;
  type?: BuilderFieldType;
  value: BuilderGroupValues;
  children: FilterParts[];
}
