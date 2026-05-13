import {
  BaseCommand,
  IConnection,
  IEnvelopeFrom,
  IEnvelopeTo,
  IFrom,
  IHeaders,
  IInboundParseAttachment,
  IInboundParseDataDto,
  ITo,
} from '@novu/application-generic';
import { Type } from 'class-transformer';
import { IsArray, IsDefined, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

/*
 * Concrete DTO is required for @ValidateNested({ each: true }) to actually run.
 * BaseCommand.create() uses plainToInstance to convert the top-level command, but
 * nested array items stay as plain objects unless @Type points to a class with
 * its own decorators — interfaces are erased at runtime, so typing this array as
 * IInboundParseAttachment[] silently disables item-level validation.
 */
export class InboundParseAttachmentCommand implements IInboundParseAttachment {
  @IsDefined()
  @IsString()
  filename: string;

  @IsDefined()
  @IsString()
  contentType: string;

  @IsDefined()
  @IsNumber()
  size: number;

  @IsDefined()
  @IsString()
  url: string;

  @IsDefined()
  @IsString()
  storagePath: string;
}

export class InboundEmailParseCommand extends BaseCommand implements IInboundParseDataDto {
  @IsDefined()
  @IsString()
  html: string;

  @IsDefined()
  @IsString()
  text: string;

  @IsDefined()
  headers: IHeaders;

  @IsDefined()
  @IsString()
  subject: string;

  @IsDefined()
  @IsString()
  messageId: string;

  @IsOptional()
  @IsString()
  inReplyTo?: string;

  @IsOptional()
  references?: string | string[];

  @IsDefined()
  @IsString()
  priority: string;

  @IsDefined()
  from: IFrom[];

  @IsDefined()
  to: ITo[];

  @IsDefined()
  date: Date;

  @IsDefined()
  @IsString()
  dkim: string;

  @IsDefined()
  @IsString()
  spf: string;

  @IsDefined()
  @IsNumber()
  spamScore: number;

  @IsDefined()
  @IsString()
  language: string;

  @IsDefined()
  cc: any[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InboundParseAttachmentCommand)
  attachments?: InboundParseAttachmentCommand[];

  @IsDefined()
  connection: IConnection;

  @IsDefined()
  envelopeFrom: IEnvelopeFrom;

  @IsDefined()
  envelopeTo: IEnvelopeTo[];
}
