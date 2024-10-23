import {
  IsArray,
  IsBoolean,
  IsDefined,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

import {
  BuilderFieldType,
  BuilderGroupValues,
  ChannelCTATypeEnum,
  FilterParts,
  IMessageAction,
  INotificationGroup,
  IPreferenceChannels,
  IWorkflowStepMetadata,
  CustomDataType,
  WorkflowOriginEnum,
  WorkflowTypeEnum,
} from '@novu/shared';

import { JsonSchema } from '@novu/framework/internal';
import { EnvironmentWithUserCommand } from '../../commands';

export class CreateWorkflowCommand extends EnvironmentWithUserCommand {
  @IsMongoId()
  @IsDefined()
  notificationGroupId?: string;

  @IsOptional()
  notificationGroup?: INotificationGroup;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsDefined()
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDefined()
  @IsArray()
  @ValidateNested()
  steps: NotificationStep[];

  @IsBoolean()
  active: boolean;

  @IsBoolean()
  @IsOptional()
  draft?: boolean;

  @IsBoolean()
  critical: boolean;

  @IsOptional()
  preferenceSettings?: IPreferenceChannels;

  @IsOptional()
  blueprintId?: string;

  @IsOptional()
  @IsString()
  __source?: string;

  @IsOptional()
  data?: CustomDataType;

  @IsOptional()
  inputs?: {
    schema: JsonSchema;
  };
  @IsOptional()
  controls?: {
    schema: JsonSchema;
  };

  @IsOptional()
  rawData?: Record<string, unknown>;

  @IsOptional()
  payloadSchema?: JsonSchema;

  @IsEnum(WorkflowTypeEnum)
  @IsDefined()
  type: WorkflowTypeEnum;

  origin: WorkflowOriginEnum;

  /**
   * Optional identifier for the workflow trigger.
   * This allows overriding the default trigger identifier generation strategy in the use case.
   * If provided, the use case will use this value instead of generating one.
   * If not provided, the use case will generate a trigger identifier based on its internal logic.
   */
  @IsOptional()
  @IsString()
  triggerIdentifier?: string;
}

export class ChannelCTACommand {
  @IsEnum(ChannelCTATypeEnum)
  type: ChannelCTATypeEnum;

  @ValidateNested()
  data: {
    url: string;
  };

  @IsOptional()
  @IsArray()
  @ValidateNested()
  action?: IMessageAction[];
}

export class NotificationStepVariantCommand {
  @IsString()
  @IsOptional()
  _templateId?: string;

  @ValidateNested()
  @IsOptional()
  template?: any;

  @IsOptional()
  uuid?: string;

  @IsOptional()
  name?: string;

  @IsBoolean()
  active?: boolean;

  @IsBoolean()
  shouldStopOnFail?: boolean;

  @ValidateNested()
  @IsOptional()
  replyCallback?: {
    active: boolean;
    url: string;
  };

  @IsOptional()
  @IsArray()
  @ValidateNested()
  filters?: MessageFilter[];

  @IsMongoId()
  @IsOptional()
  _id?: string;

  @IsOptional()
  metadata?: IWorkflowStepMetadata;

  @IsOptional()
  inputs?: {
    schema: JsonSchema;
  };
  @IsOptional()
  controls?: {
    schema: JsonSchema;
  };

  @IsOptional()
  output?: {
    schema: JsonSchema;
  };

  @IsOptional()
  stepId?: string;
}

export class NotificationStep extends NotificationStepVariantCommand {
  @IsOptional()
  @IsArray()
  @ValidateNested()
  variants?: NotificationStepVariantCommand[];
}

export class MessageFilter {
  isNegated?: boolean;

  @IsString()
  type?: BuilderFieldType;

  @IsString()
  value: BuilderGroupValues;

  @IsArray()
  children: FilterParts[];
}
