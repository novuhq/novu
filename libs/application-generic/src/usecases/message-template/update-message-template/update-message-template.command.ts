import {
  IActor,
  IEmailBlock,
  IMessageCTA,
  ITemplateVariable,
  MessageTemplateContentType,
  ResourceTypeEnum,
  StepTypeEnum,
} from '@novu/shared';
import { IsDefined, IsEnum, IsMongoId, IsOptional, IsString, ValidateNested } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../commands';
import { JSONSchema } from '../../../value-objects';

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
    schema: JSONSchema;
  };
  @IsOptional()
  controls?: {
    schema: JSONSchema;
  };

  @IsOptional()
  output?: { schema: JSONSchema };

  @IsOptional()
  code?: string;

  @IsEnum(ResourceTypeEnum)
  @IsDefined()
  workflowType: ResourceTypeEnum;
}
