import { IsDefined, IsString, IsOptional } from 'class-validator';
import { IEmailBlock, MessageTemplateContentType } from '@novu/shared';

export class TestSendEmailRequestDto {
  @IsDefined()
  @IsString()
  contentType: MessageTemplateContentType;

  @IsDefined()
  payload: any; // eslint-disable-line @typescript-eslint/no-explicit-any

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
}
