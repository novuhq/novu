import { IsDefined, IsEnum, IsMongoId, IsOptional, ValidateNested } from 'class-validator';
import { ChannelTypeEnum, StepTypeEnum, IEmailBlock, IMessageCTA } from '@novu/shared';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class UpdateMessageTemplateCommand extends EnvironmentWithUserCommand {
  static create(data: UpdateMessageTemplateCommand) {
    return CommandHelper.create<UpdateMessageTemplateCommand>(UpdateMessageTemplateCommand, data);
  }

  @IsDefined()
  @IsMongoId()
  templateId: string;

  @IsOptional()
  @IsEnum(StepTypeEnum)
  type: StepTypeEnum;

  @IsOptional()
  name?: string;

  @IsOptional()
  subject?: string;

  @IsOptional()
  title?: string;

  @IsOptional()
  content: string | IEmailBlock[];

  @IsOptional()
  contentType: 'editor' | 'customHtml';

  @IsOptional()
  @ValidateNested()
  cta: IMessageCTA;

  @IsOptional()
  feedId: string;

  @IsMongoId()
  parentChangeId: string;
}
