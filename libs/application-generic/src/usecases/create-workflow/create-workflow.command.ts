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
  IMessageAction,
  IPreferenceChannels,
  FilterParts,
  IWorkflowStepMetadata,
  NotificationTemplateCustomData,
  INotificationGroup,
  WorkflowTypeEnum,
} from '@novu/shared';

import { EnvironmentWithUserCommand } from '../../commands';
import { JSONSchema7 } from 'json-schema';

export class CreateWorkflowCommand extends EnvironmentWithUserCommand {
  @IsMongoId()
  @IsDefined()
  notificationGroupId: string;

  @IsOptional()
  notificationGroup?: INotificationGroup;

  @IsOptional()
  @IsArray()
  tags: string[];

  @IsDefined()
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description: string;

  @IsDefined()
  @IsArray()
  @ValidateNested()
  steps: NotificationStep[];

  @IsBoolean()
  active: boolean;

  @IsBoolean()
  draft: boolean;

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
  data?: NotificationTemplateCustomData;

  @IsOptional()
  inputs?: {
    schema: JSONSchema7;
  };

  @IsOptional()
  rawData?: Record<string, unknown>;

  @IsOptional()
  payloadSchema?: JSONSchema7;

  @IsEnum(WorkflowTypeEnum)
  @IsDefined()
  type: WorkflowTypeEnum;
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
    schema: JSONSchema7;
  };

  @IsOptional()
  output?: {
    schema: JSONSchema7;
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
