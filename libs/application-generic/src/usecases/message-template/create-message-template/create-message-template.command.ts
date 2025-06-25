import { IsDefined, IsEnum, IsMongoId, IsOptional, IsString, ValidateNested } from 'class-validator';

import {
  IActor,
  IEmailBlock,
  IMessageCTA,
  ITemplateVariable,
  MessageTemplateContentType,
  StepTypeEnum,
  ResourceTypeEnum,
} from '@novu/shared';

import { EnvironmentWithUserCommand } from '../../../commands';
import { JSONSchema } from '../../../value-objects';

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
  controls?: {
    schema: JSONSchema;
  };

  @IsOptional()
  output?: {
    schema: JSONSchema;
  };

  @IsOptional()
  code?: string;

  @IsOptional()
  stepId?: string;

  @IsEnum(ResourceTypeEnum)
  @IsDefined()
  workflowType: ResourceTypeEnum;
}
