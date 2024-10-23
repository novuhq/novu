import {
  IsDefined,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import {
  StepTypeEnum,
  IEmailBlock,
  IMessageCTA,
  ITemplateVariable,
  IActor,
  MessageTemplateContentType,
  WorkflowTypeEnum,
} from '@novu/shared';
import { JsonSchema } from '@novu/framework/internal';
import { EnvironmentWithUserCommand } from '../../../commands';

export class UpdateMessageTemplateCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  @IsMongoId()
  templateId: string;

  @IsOptional()
  @IsEnum(StepTypeEnum)
  type: StepTypeEnum;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  variables?: ITemplateVariable[];

  @IsOptional()
  content?: string | IEmailBlock[];

  @IsOptional()
  contentType?: MessageTemplateContentType;

  @IsOptional()
  @ValidateNested()
  cta?: IMessageCTA;

  @IsOptional()
  feedId?: string | null;

  @IsOptional()
  layoutId?: string | null;

  @IsMongoId()
  @IsOptional()
  parentChangeId?: string;

  @IsOptional()
  @IsString()
  preheader?: string;

  @IsOptional()
  @IsString()
  senderName?: string;

  @IsOptional()
  actor?: IActor;

  @IsOptional()
  inputs?: {
    schema: JsonSchema;
  };
  @IsOptional()
  controls?: {
    schema: JsonSchema;
  };

  @IsOptional()
  output?: {
    schema: JsonSchema;
  };

  @IsOptional()
  code?: string;

  @IsEnum(WorkflowTypeEnum)
  @IsDefined()
  workflowType: WorkflowTypeEnum;
}
