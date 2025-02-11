import type {
  BuilderFieldType,
  BuilderGroupValues,
  CustomDataType,
  FilterParts,
  WorkflowOriginEnum,
  WorkflowTypeEnum,
} from '../../types';
import { JSONSchemaDto } from '../../dto/workflows';
import type { StepContentIssue, StepIntegrationIssue, StepIssue } from '../../dto/workflows/step.dto';
import { ControlSchemas, IMessageTemplate } from '../message-template';
import { INotificationGroup } from '../notification-group';
import { INotificationBridgeTrigger, INotificationTrigger } from '../notification-trigger';
import { IPreferenceChannels } from '../subscriber-preference';
import { IWorkflowStepMetadata } from '../step';

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
  type?: WorkflowTypeEnum;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payloadSchema?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rawData?: any;
  data?: CustomDataType;
  origin?: WorkflowOriginEnum;
}

export class IGroupedBlueprint {
  name: string;
  blueprints: IBlueprint[];
}

export interface IBlueprint extends INotificationTemplate {
  notificationGroup: INotificationGroup;
}

export class StepIssues {
  controls?: Record<string, StepContentIssue[]>;
  integration?: Record<string, StepIntegrationIssue[]>;
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
