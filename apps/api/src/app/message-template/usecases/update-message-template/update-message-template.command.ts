import { IsDefined, IsEnum, IsMongoId, IsOptional, ValidateNested } from 'class-validator';
import {
  StepTypeEnum,
  IEmailBlock,
  IMessageCTA,
  ITemplateVariable,
  IActor,
  MessageTemplateContentType,
} from '@novu/shared';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class UpdateMessageTemplateCommand extends EnvironmentWithUserCommand {
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
  variables?: ITemplateVariable[];

  @IsOptional()
  content: string | IEmailBlock[];

  @IsOptional()
  contentType: MessageTemplateContentType;

  @IsOptional()
  @ValidateNested()
  cta: IMessageCTA;

  @IsOptional()
  feedId: string;

  @IsMongoId()
  parentChangeId: string;

  @IsOptional()
  preheader?: string;

  @IsOptional()
  actor?: IActor;
}
