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
  BuilderFieldOperator,
  BuilderFieldType,
  BuilderGroupValues,
  ChannelCTATypeEnum,
  IMessageAction,
  DigestUnitEnum,
  IPreferenceChannels,
} from '@novu/shared';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { MessageTemplate } from '../../../shared/dtos/message-template';

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
  @ValidateNested()
  steps: NotificationStepCommand[];

  @IsBoolean()
  active: boolean;

  @IsBoolean()
  draft: boolean;

  @IsBoolean()
  critical: boolean;

  @IsOptional()
  preferenceSettings?: IPreferenceChannels;
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

class NotificationStepCommand {
  @ValidateNested()
  @IsOptional()
  template?: MessageTemplate;

  @IsOptional()
  name?: string;

  @IsBoolean()
  active?: boolean;

  @IsBoolean()
  shouldStopOnFail?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested()
  filters?: MessageFilter[];

  @IsMongoId()
  @IsOptional()
  _id?: string;

  @IsOptional()
  metadata?: {
    amount?: number;
    unit?: DigestUnitEnum;
    digestKey?: string;
    delayPath?: string;
  };
}

export class MessageFilter {
  isNegated: boolean;

  @IsString()
  type: BuilderFieldType;

  @IsString()
  value: BuilderGroupValues;

  @IsArray()
  children: {
    field: string;
    value: string;
    operator: BuilderFieldOperator;
  }[];
}
