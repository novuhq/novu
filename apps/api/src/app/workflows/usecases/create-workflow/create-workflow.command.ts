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
} from '@novu/shared';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { MessageTemplate } from '../../../shared/dtos/message-template';

export class CreateWorkflowCommand extends EnvironmentWithUserCommand {
  @IsMongoId()
  @IsDefined()
  notificationGroupId: string;

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

export class NotificationStep {
  @ValidateNested()
  @IsOptional()
  template?: MessageTemplate;

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
}

export class MessageFilter {
  isNegated: boolean;

  @IsString()
  type: BuilderFieldType;

  @IsString()
  value: BuilderGroupValues;

  @IsArray()
  children: FilterParts[];
}
