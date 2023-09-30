import { IsDefined, IsNumber, IsOptional, IsString } from 'class-validator';
import { BaseCommand } from '@novu/application-generic';

export class InboundEmailParseCommand extends BaseCommand {
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

  @IsDefined()
  @IsOptional()
  attachments?: any[];

  @IsDefined()
  connection: IConnection;

  @IsDefined()
  envelopeFrom: IEnvelopeFrom;

  @IsDefined()
  envelopeTo: IEnvelopeTo[];
}

export interface IHeaders {
  'content-type': string;
  from: string;
  to: string;
  subject: string;
  'message-id': string;
  date: string;
  'mime-version': string;
}

export interface IFrom {
  address: string;
  name: string;
}

export interface ITo {
  address: string;
  name: string;
}

export interface ITlsOptions {
  name: string;
  standardName: string;
  version: string;
}

export interface IMailFrom {
  address: string;
  args: boolean;
}

export interface IRcptTo {
  address: string;
  args: boolean;
}

export interface IEnvelope {
  mailFrom: IMailFrom;
  rcptTo: IRcptTo[];
}

export interface IConnection {
  id: string;
  remoteAddress: string;
  remotePort: number;
  clientHostname: string;
  openingCommand: string;
  hostNameAppearsAs: string;
  xClient: any;
  xForward: any;
  transmissionType: string;
  tlsOptions: ITlsOptions;
  envelope: IEnvelope;
  transaction: number;
  mailPath: string;
}

export interface IEnvelopeFrom {
  address: string;
  args: boolean;
}

export interface IEnvelopeTo {
  address: string;
  args: boolean;
}
