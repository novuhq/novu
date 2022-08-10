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
} from '@novu/shared';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { MessageTemplateDto } from '../../dto';

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
  template?: MessageTemplateDto;

  @IsOptional()
  name?: string;

  @IsBoolean()
  active?: boolean;

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
