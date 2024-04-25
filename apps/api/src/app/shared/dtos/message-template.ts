import { IsDefined, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
import {
  StepTypeEnum,
  IEmailBlock,
  ITemplateVariable,
  IMessageCTA,
  ActorTypeEnum,
  MessageTemplateContentType,
  IActor,
} from '@novu/shared';

export class MessageTemplate {
  @IsOptional()
  @IsEnum(StepTypeEnum)
  type: StepTypeEnum;

  @IsOptional()
  variables?: ITemplateVariable[];

  @IsDefined()
  content: string | IEmailBlock[];

  @IsOptional()
  contentType?: MessageTemplateContentType;

  @IsOptional()
  @ValidateNested()
  cta?: IMessageCTA;

  @IsOptional()
  @IsString()
  feedId?: string;

  @IsOptional()
  layoutId?: string | null;

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
  @IsString()
  preheader?: string;

  @IsOptional()
  @IsString()
  senderName?: string;

  @IsOptional()
  actor?: IActor;

  @IsOptional()
  _creatorId?: string;
}
