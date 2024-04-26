import {
  IsDefined,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { JSONSchema7 } from 'json-schema';

import {
  StepTypeEnum,
  IEmailBlock,
  IMessageCTA,
  ITemplateVariable,
  IActor,
  MessageTemplateContentType,
  WorkflowTypeEnum,
} from '@novu/shared';

import { EnvironmentWithUserCommand } from '../../../commands';

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
  @IsString()
  feedId?: string;

  @IsOptional()
  @IsString()
  layoutId?: string | null;

  @IsMongoId()
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
  _creatorId?: string;

  @IsOptional()
  inputs?: {
    schema: JSONSchema7;
  };

  @IsOptional()
  output?: {
    schema: JSONSchema7;
  };

  @IsOptional()
  stepId?: string;

  @IsEnum(WorkflowTypeEnum)
  @IsDefined()
  workflowType: WorkflowTypeEnum;
}
