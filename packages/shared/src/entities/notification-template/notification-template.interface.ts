import { JSONSchemaDto } from '../../dto/workflows';
import type {
  BuilderFieldType,
  BuilderGroupValues,
  CustomDataType,
  FilterParts,
  ResourceOriginEnum,
  ResourceTypeEnum,
} from '../../types';
import { RuntimeIssue } from '../../utils/issues';
import { ControlSchemas, IMessageTemplate } from '../message-template';
import { INotificationGroup } from '../notification-group';
import { INotificationBridgeTrigger, INotificationTrigger } from '../notification-trigger';
import { IWorkflowStepMetadata } from '../step';
import { IPreferenceChannels } from '../subscriber-preference';

export interface INotificationTemplate {
  _id?: string;
  name: string;
  description?: string;
  _notificationGroupId: string;
  _parentId?: string;
  _environmentId: string;
  tags: string[];
  draft?: boolean;
  active: boolean;
  critical: boolean;
  preferenceSettings: IPreferenceChannels;
  createdAt?: string;
  updatedAt?: string;
  steps: INotificationTemplateStep[] | INotificationBridgeTrigger[];
  triggers: INotificationTrigger[];
  isBlueprint?: boolean;
  blueprintId?: string;
  type?: ResourceTypeEnum;
  payloadSchema?: any;
  rawData?: any;
  data?: CustomDataType;
  origin?: ResourceOriginEnum;
  isTranslationEnabled?: boolean;
}

export class IGroupedBlueprint {
  name: string;
  blueprints: IBlueprint[];
}

export interface IBlueprint extends INotificationTemplate {
  notificationGroup: INotificationGroup;
}

export class StepIssues {
  controls?: Record<string, RuntimeIssue[]>;
  integration?: Record<string, RuntimeIssue[]>;
}

export interface IStepVariant {
  _id?: string;
  uuid?: string;
  stepId?: string;
  issues?: StepIssues;
  name?: string;
  filters?: IMessageFilter[];
  _templateId?: string;
  _parentId?: string | null;
  template?: IMessageTemplate;
  active?: boolean;
  shouldStopOnFail?: boolean;
  replyCallback?: {
    active: boolean;
    url: string;
  };
  metadata?: IWorkflowStepMetadata;
  inputs?: {
    schema: JSONSchemaDto;
  };
  /**
   * @deprecated This property is deprecated and will be removed in future versions.
   * Use IMessageTemplate.controls
   */
  controls?: ControlSchemas;
  /*
   * controlVariables exists
   * only on none production environment in order to provide stateless control variables on fly
   */
  controlVariables?: Record<string, unknown>;
  bridgeUrl?: string;
}

export interface INotificationTemplateStep extends IStepVariant {
  variants?: IStepVariant[];
}

export interface IMessageFilter {
  isNegated?: boolean;
  type?: BuilderFieldType;
  value: BuilderGroupValues;
  children: FilterParts[];
}
