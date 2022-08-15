import { IsDefined, IsEnum, IsMongoId, IsOptional, IsString, ValidateNested } from 'class-validator';
import { StepTypeEnum, IEmailBlock, IMessageCTA } from '@novu/shared';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class CreateMessageTemplateCommand extends EnvironmentWithUserCommand {
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
