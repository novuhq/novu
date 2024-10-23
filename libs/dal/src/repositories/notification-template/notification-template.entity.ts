import { Types } from 'mongoose';
import {
  BuilderFieldType,
  BuilderGroupValues,
  ControlsDto,
  FilterParts,
  IMessageFilter,
  IMessageTemplate,
  INotificationTemplate,
  INotificationTemplateStep,
  INotificationTrigger,
  INotificationTriggerVariable,
  IPreferenceChannels,
  IStepVariant,
  ITriggerReservedVariable,
  IWorkflowStepMetadata,
  CustomDataType,
  TriggerTypeEnum,
  WorkflowOriginEnum,
  WorkflowTypeEnum,
} from '@novu/shared';

import { JSONSchema } from 'json-schema-to-ts';
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

  data?: CustomDataType;

  type?: WorkflowTypeEnum;

  origin?: WorkflowOriginEnum;

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

  bridgeUrl?: string;
  /**
   * Control variables for the step
   * Same as ControlValues
   */
  controlVariables?: ControlsDto;

  controls?: {
    schema: JSONSchema;
  };
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
