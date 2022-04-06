import {
  ArrayNotEmpty,
  IsArray,
  IsDefined,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ChannelCTATypeEnum, ChannelTypeEnum } from '@novu/shared';
import { IEmailBlock } from '@novu/dal';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { MessageFilter } from '../create-notification-template';

export class UpdateNotificationTemplateCommand extends EnvironmentWithUserCommand {
  static create(data: UpdateNotificationTemplateCommand) {
    return CommandHelper.create<UpdateNotificationTemplateCommand>(UpdateNotificationTemplateCommand, data);
  }

  @IsDefined()
  @IsMongoId()
  templateId: string;

  @IsArray()
  @IsOptional()
  tags: string[];

  @IsString()
  @IsOptional()
  name: string;

  @IsString()
  @IsOptional()
  description: string;

  @IsOptional()
  @IsMongoId({
    message: 'Bad group id name',
  })
  notificationGroupId: string;

  @IsArray()
  @ValidateNested()
  @IsOptional()
  messages: NotificationChannelDto[];
}

export class ChannelCTADto {
  @IsEnum(ChannelCTATypeEnum)
  type: ChannelCTATypeEnum;

  data: {
    url: string;
  };
}

export class NotificationChannelDto {
  @IsOptional()
  @IsEnum(ChannelTypeEnum)
  type: ChannelTypeEnum;

  @IsDefined()
  content: string | IEmailBlock[];

  @IsOptional()
  contentType?: 'editor' | 'customHtml';

  @IsOptional()
  @ValidateNested()
  cta: ChannelCTADto;

  @IsOptional()
  name?: string;

  @IsOptional()
  subject?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested()
  filters?: MessageFilter[];

  @IsMongoId()
  @IsOptional()
  _id?: string;
}
