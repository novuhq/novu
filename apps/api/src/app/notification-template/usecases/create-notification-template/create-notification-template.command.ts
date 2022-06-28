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
import { BuilderFieldOperator, BuilderFieldType, BuilderGroupValues, ChannelCTATypeEnum } from '@novu/shared';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { MessageTemplateDto } from '../../dto';

export class CreateNotificationTemplateCommand extends EnvironmentWithUserCommand {
  static create(data: CreateNotificationTemplateCommand) {
    return CommandHelper.create(CreateNotificationTemplateCommand, data);
  }

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
}

export class ChannelCTACommand {
  @IsEnum(ChannelCTATypeEnum)
  type: ChannelCTATypeEnum;

  @ValidateNested()
  data: {
    url: string;
  };
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
