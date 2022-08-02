import { IsDefined, IsEnum, IsMongoId, IsOptional, IsString, ValidateNested } from 'class-validator';
import { StepTypeEnum, IEmailBlock, IMessageCTA } from '@novu/shared';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class CreateMessageTemplateCommand extends EnvironmentWithUserCommand {
  static create(data: CreateMessageTemplateCommand) {
    return CommandHelper.create<CreateMessageTemplateCommand>(CreateMessageTemplateCommand, data);
  }

  @IsDefined()
  @IsEnum(StepTypeEnum)
  type: StepTypeEnum;

  @IsOptional()
  name?: string;

  @IsOptional()
  subject?: string;

  @IsOptional()
  title?: string;

  @IsDefined()
  content: string | IEmailBlock[];

  @IsOptional()
  contentType: 'editor' | 'customHtml';

  @IsOptional()
  @ValidateNested()
  cta: IMessageCTA;

  @IsOptional()
  @IsString()
  feedId: string;

  @IsMongoId()
  parentChangeId: string;
}
