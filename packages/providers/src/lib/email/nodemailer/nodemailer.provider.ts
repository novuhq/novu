import { EmailProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  IEmailOptions,
  IEmailProvider,
  ISendMessageSuccessResponse,
  ICheckIntegrationResponse,
  CheckIntegrationResponseEnum,
} from '@novu/stateless';
import nodemailer, { SendMailOptions, Transporter } from 'nodemailer';
import DKIM from 'nodemailer/lib/dkim';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { ConnectionOptions } from 'tls';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

interface INodemailerConfig {
  from: string;
  host: string;
  port: number;
  secure?: boolean;
  user?: string;
  password?: string;
  dkim?: DKIM.SingleKeyOptions;
  ignoreTls?: boolean;
  requireTls?: boolean;
  tlsOptions?: ConnectionOptions;
  senderName?: string;
}

export class NodemailerProvider extends BaseProvider implements IEmailProvider {
  id = EmailProviderIdEnum.CustomSMTP; // nodemailer
  protected casing: CasingEnum = CasingEnum.CAMEL_CASE;

  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;

  private transports: Transporter;

  constructor(private config: INodemailerConfig) {
    super();
    let { dkim } = this.config;

    if (!dkim?.domainName || !dkim?.privateKey || !dkim?.keySelector) {
      dkim = undefined;
    }

    const authEnabled = this.config.user && this.config.password;

    const tls: ConnectionOptions = this.getTlsOptions();

    const smtpTransportOptions: SMTPTransport.Options = {
      name: this.config.host,
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: authEnabled
        ? {
            user: this.config.user,
            pass: this.config.password,
          }
        : undefined,
      dkim,
      ignoreTLS: this.config.ignoreTls,
      requireTLS: this.config.requireTls,
      ...(tls && { tls }),
    };

    this.transports = nodemailer.createTransport(smtpTransportOptions);
  }

  getTlsOptions(): ConnectionOptions | undefined {
    /**
     * Only render TLS options if secure is enabled to true.
     * Reference: https://nodemailer.com/smtp/#tls-options
     *
     */
    if (this.config.secure && !!this.config.tlsOptions) {
      this.validateTlsOptions();

      return this.config.tlsOptions;
    }

    return undefined;
  }

  validateTlsOptions(): void {
    try {
      JSON.parse(JSON.stringify(this.config.tlsOptions));
    } catch {
      throw new Error(
        'TLS options is not a valid JSON. Check again the value set for NODEMAILER_TLS_OPTIONS',
      );
    }
  }

  async sendMessage(
    options: IEmailOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {},
  ): Promise<ISendMessageSuccessResponse> {
    const mailData = this.createMailData(options);
    const info = await this.transports.sendMail(
      this.transform(bridgeProviderData, mailData).body,
    );

    return {
      id: info?.messageId,
      date: new Date().toISOString(),
    };
  }

  async checkIntegration(
    options: IEmailOptions,
  ): Promise<ICheckIntegrationResponse> {
    try {
      const mailData = this.createMailData(options);
      await this.transports.sendMail(mailData);

      return {
        success: true,
        message: 'Integrated successfully!',
        code: CheckIntegrationResponseEnum.SUCCESS,
      };
    } catch (error) {
      return {
        success: false,
        message: error?.message,
        // nodemailer does not provide a way to distinguish errors
        code: CheckIntegrationResponseEnum.FAILED,
      };
    }
  }

  private createMailData(options: IEmailOptions): SendMailOptions {
    const sendMailOptions: SendMailOptions = {
      from: {
        address: options.from || this.config.from,
        name: options.senderName || this.config.senderName || '',
      },
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      cc: options.cc,
      attachments: options.attachments?.map((attachment) => ({
        filename: attachment?.name,
        content: attachment.file,
        contentType: attachment.mime,
        cid: attachment.cid,
        contentDisposition: attachment.disposition ?? (Boolean(attachment.cid) ? 'inline' : undefined),
      })),
      bcc: options.bcc,
    };

    if (options.replyTo) {
      sendMailOptions.replyTo = options.replyTo;
    }

    return sendMailOptions;
  }
}
