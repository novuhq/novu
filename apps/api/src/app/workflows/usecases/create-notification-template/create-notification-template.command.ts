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
} from '@novu/shared';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { MessageTemplate } from '../../../shared/dtos/message-template';
import { Type } from 'class-transformer';
import { VariantWithFilter } from '@novu/application-generic';

/**
 * DEPRECATED:
 * This command is deprecated and will be removed in the future.
 * Please use the CreateWorkflowCommand instead.
 */
export class CreateNotificationTemplateCommand extends EnvironmentWithUserCommand {
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
  @ValidateNested({ each: true })
  @Type(() => NotificationStep)
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

export class NotificationStepVariant {
  @IsOptional()
  @IsString()
  _templateId?: string;

  @ValidateNested()
  @IsOptional()
  template?: MessageTemplate;

  @IsOptional()
  @IsString()
  uuid?: string;

  @IsOptional()
  @IsBoolean()
  name?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsBoolean()
  @IsOptional()
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

export class NotificationStep extends NotificationStepVariant {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NotificationStepVariant)
  @VariantWithFilter()
  variants?: NotificationStepVariant[];
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
