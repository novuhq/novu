import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';
import { BaseCommand } from '@novu/application-generic';

export class EmailParseCommand extends BaseCommand {
  @IsNumber()
  @IsOptional()
  id?: number;

  @IsString()
  rcptTo: string;

  @IsString()
  mailFrom: string;

  @IsString()
  @IsOptional()
  token?: string;

  @IsString()
  subject: string;

  @IsString()
  messageId: string;

  @IsNumber()
  @IsOptional()
  timestamp?: number;

  @IsString()
  @IsOptional()
  size?: string;

  @IsString()
  @IsOptional()
  spamStatus?: string;

  @IsBoolean()
  @IsOptional()
  bounce?: boolean;

  @IsBoolean()
  @IsOptional()
  receivedWithSsl?: boolean;

  @IsString()
  to: string;

  @IsString()
  @IsOptional()
  cc?: string;

  @IsString()
  from: string;

  @IsString()
  date: string;

  @IsOptional()
  inReplyTo?: any;

  @IsOptional()
  references?: any;

  @IsString()
  htmlBody: string;

  @IsNumber()
  attachmentQuantity: number;

  @IsOptional()
  autoSubmitted?: any;

  @IsOptional()
  replyTo?: any;

  @IsString()
  @IsOptional()
  plainBody?: string;

  @IsOptional()
  attachments?: any[];
}
