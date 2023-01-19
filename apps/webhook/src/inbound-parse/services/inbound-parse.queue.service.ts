import { Queue, QueueBaseOptions, Worker } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { getRedisPrefix } from '@novu/shared';
import { EmailParse } from '../usecases/email-parse/email-parse.usecase';
import { EmailParseCommand } from '../usecases/email-parse/email-parse.command';

@Injectable()
export class InboundParseQueueService {
  readonly QUEUE_NAME = 'inbound-mail';

  private bullConfig: QueueBaseOptions = {
    connection: {
      db: Number(process.env.REDIS_DB_INDEX),
      port: Number(process.env.REDIS_PORT),
      host: process.env.REDIS_HOST,
      password: process.env.REDIS_PASSWORD,
      connectTimeout: 50000,
      keepAlive: 30000,
      family: 4,
      keyPrefix: getRedisPrefix(),
    },
  };
  public readonly queue: Queue;
  public readonly worker: Worker;

  constructor(private emailParseUsecase: EmailParse) {
    this.queue = new Queue<EmailParseCommand>(this.QUEUE_NAME, {
      ...this.bullConfig,
      defaultJobOptions: {
        removeOnComplete: true,
      },
    });

    this.worker = new Worker(this.QUEUE_NAME, this.getWorkerProcessor(), this.getWorkerOpts());
  }

  private getWorkerOpts() {
    return {
      ...this.bullConfig,
      lockDuration: 90000,
      concurrency: 50,
    };
  }

  public getWorkerProcessor() {
    return async ({ data }: { data: IEmailData }) => {
      await this.emailParseUsecase.execute(
        EmailParseCommand.create({
          messageId: data.messageId,
          to: data.to[0].address,
          attachmentQuantity: data.attachments.length,
          attachments: data.attachments,
          from: data.from[0].address,
          cc: data.cc[0]?.address,
          date: data.date.toString(),
          mailFrom: data.from[0].address,
          htmlBody: data.html,
          rcptTo: data.envelopeTo[0].address,
          subject: data.subject,
          replyTo: data.text,

          /*
           * id: data.messageId,
           * spamStatus: data.spamScore,
           *
           * id: null,
           * autoSubmitted: null,
           * bounce: null,
           * plainBody: null,
           * inReplyTo: null,
           * receivedWithSsl: null,
           * size: null,
           * references: null,
           * spamStatus: null,
           * token: null,
           * timestamp: null,
           */
        })
      );
    };
  }
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

export interface IEmailData {
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
  attachments: any[];
  connection: IConnection;
  envelopeFrom: IEnvelopeFrom;
  envelopeTo: IEnvelopeTo[];
}
