import { EmailProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  CheckIntegrationResponseEnum,
  ICheckIntegrationResponse,
  IEmailOptions,
  IEmailProvider,
  ISendMessageSuccessResponse,
} from '@novu/stateless';
import nodemailer, { SendMailOptions, Transporter } from 'nodemailer';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

const SMTP_TIMEOUT_MS = 30_000;
const SMTP_CONNECT_RETRY_LIMIT = 3;
const SMTP_CONNECT_RETRY_DELAY_MS = 200;

const RETRYABLE_SMTP_CONNECT_CODES = new Set([
  'ESOCKET',
  'ECONNECTION',
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'EPIPE',
  'ETLS',
]);

interface SmtpConnectError {
  code?: string;
  command?: string;
}

function isRetryableOutlookConnectError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const { code, command } = error as SmtpConnectError;

  if (!code || !RETRYABLE_SMTP_CONNECT_CODES.has(code)) {
    return false;
  }

  return !command || command === 'CONN';
}

export class Outlook365Provider extends BaseProvider implements IEmailProvider {
  id = EmailProviderIdEnum.Outlook365;
  protected casing: CasingEnum = CasingEnum.CAMEL_CASE;
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;
  private transports: Transporter;

  constructor(
    private config: {
      from: string;
      senderName: string;
      password: string;
    }
  ) {
    super();
    this.transports = nodemailer.createTransport({
      host: 'smtp.office365.com',
      port: 587,
      requireTLS: true,
      connectionTimeout: SMTP_TIMEOUT_MS,
      greetingTimeout: SMTP_TIMEOUT_MS,
      auth: {
        user: this.config.from,
        pass: this.config.password,
      },
      tls: {
        ciphers: 'SSLv3',
      },
    });
  }

  async sendMessage(
    options: IEmailOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const mailData = this.createMailData(options);
    const merged = this.transform(bridgeProviderData, mailData);
    const info = await this.sendMailWithConnectRetry(merged.body);

    return {
      id: info?.messageId,
      date: new Date().toISOString(),
    };
  }

  async checkIntegration(options: IEmailOptions): Promise<ICheckIntegrationResponse> {
    try {
      const mailData = this.createMailData(options);
      await this.sendMailWithConnectRetry(mailData);

      return {
        success: true,
        message: 'Integrated successfully!',
        code: CheckIntegrationResponseEnum.SUCCESS,
      };
    } catch (error) {
      return {
        success: false,
        message: error?.message,
        code: CheckIntegrationResponseEnum.FAILED,
      };
    }
  }

  private async sendMailWithConnectRetry(mailData: SendMailOptions) {
    const lastAttemptIndex = SMTP_CONNECT_RETRY_LIMIT - 1;

    for (let attempt = 0; attempt < SMTP_CONNECT_RETRY_LIMIT; attempt += 1) {
      try {
        return await this.transports.sendMail(mailData);
      } catch (error) {
        if (!isRetryableOutlookConnectError(error) || attempt === lastAttemptIndex) {
          throw error;
        }

        await wait(SMTP_CONNECT_RETRY_DELAY_MS * 2 ** attempt);
      }
    }

    throw new Error('Outlook365 SMTP connect retry failed');
  }

  private createMailData(options: IEmailOptions): SendMailOptions {
    const sendMailOptions: SendMailOptions = {
      from: {
        address: options.from || this.config.from,
        name: options.senderName || this.config.senderName,
      },
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      ...(options.cc?.length ? { cc: options.cc } : {}),
      ...(options.bcc?.length ? { bcc: options.bcc } : {}),
      ...(options.alternatives?.length ? { alternatives: options.alternatives } : {}),
      attachments: options.attachments?.map((attachment) => ({
        filename: attachment.name,
        content: attachment.file,
        contentType: attachment.mime,
        cid: attachment.cid,
        contentDisposition:
          (attachment.disposition as 'inline' | 'attachment') ?? (attachment.cid ? 'inline' : undefined),
      })),
    };

    if (options.replyTo) {
      sendMailOptions.replyTo = options.replyTo;
    }

    if (options.headers && Object.keys(options.headers).length > 0) {
      sendMailOptions.headers = options.headers;
    }

    return sendMailOptions;
  }
}

async function wait(ms: number): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}
