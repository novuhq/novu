import {
  IBulkJobParams,
  IJobParams,
} from '../services/queues/queue-base.service';

export interface IInboundParseDataDto {
  html: string;
  text: string;
  headers: IHeaders;
  subject: string;
  messageId: string;
  priority: string;
  from: IFrom[];
  to: ITo[];
  date: Date;
  dkim: string;
  spf: string;
  spamScore: number;
  language: string;
  cc: any[];
  attachments?: any[];
  connection: IConnection;
  envelopeFrom: IEnvelopeFrom;
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

export interface IInboundParseJobDto extends IJobParams {
  data?: IInboundParseDataDto;
}

export interface IInboundParseBulkJobDto extends IBulkJobParams {
  data: IInboundParseDataDto;
}
