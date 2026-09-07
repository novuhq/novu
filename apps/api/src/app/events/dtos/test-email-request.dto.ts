import { IEmailBlock, MessageTemplateContentType } from '@novu/shared';
import { IsBoolean, IsDefined, IsOptional, IsString } from 'class-validator';

export class TestSendEmailRequestDto {
  @IsDefined()
  @IsString()
  contentType: MessageTemplateContentType;

  @IsDefined()
  payload: any;

  @IsDefined()
  @IsString()
  subject: string;

  @IsOptional()
  @IsString()
  preheader?: string;

  @IsDefined()
  content: string | IEmailBlock[];

  @IsDefined()
  to: string | string[];

  @IsOptional()
  @IsString()
  layoutId?: string | null;

  @IsOptional()
  @IsBoolean()
  bridge?: boolean = false;

  @IsOptional()
  @IsString()
  stepId?: string | null;

  @IsOptional()
  @IsString()
  workflowId?: string | null;

  @IsOptional()
  controls: any;
}
