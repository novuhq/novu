import {
  ChannelTypeEnum,
  IEmailOptions,
  IEmailProvider,
  ISendMessageSuccessResponse,
  ICheckIntegrationResponse,
  CheckIntegrationResponseEnum,
  IEmailEventBody,
  EmailEventStatusEnum,
} from '@novu/stateless';

import mailchimp from '@mailchimp/mailchimp_transactional';
import { IMandrilInterface } from './mandril.interface';

export enum MandrillStatusEnum {
  OPENED = 'open',
  SENT = 'send',
  DEFERRED = 'deferral',
  HARD_BOUNCED = 'hard_bounce',
  SOFT_BOUNCED = 'soft_bounce',
  CLICKED = 'click',
  SPAM = 'spam',
  UNSUBSCRIBED = 'unsub',
  REJECTED = 'reject',
  DELIVERED = 'delivered',
}

export class MandrillProvider implements IEmailProvider {
  id = 'mandrill';
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;

  private transporter: IMandrilInterface;

  constructor(
    private config: {
      apiKey: string;
      from: string;
    }
  ) {
    this.transporter = mailchimp(this.config.apiKey);
  }

  async sendMessage(
    options: IEmailOptions
  ): Promise<ISendMessageSuccessResponse> {
    let to = [];

    if (typeof options.to === 'string') {
      to = [
        {
          email: typeof options.to === 'string' ? options.to : options.to[0],
          type: 'to',
        },
      ];
    } else {
      to = options.to.map((item) => ({
        email: item,
        type: 'to',
      }));
    }

    const response = await this.transporter.messages.send({
      message: {
        from_email: this.config.from,
        subject: options.subject,
        html: options.html,
        to,
        attachments: options.attachments?.map((attachment) => ({
          content: attachment.file.toString(),
          type: attachment.mime,
          name: attachment?.name,
        })),
      },
    });

    return {
      id: response[0]._id,
      date: new Date().toISOString(),
    };
  }

  async checkIntegration(): Promise<ICheckIntegrationResponse> {
    try {
      await this.transporter.users.ping();

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

  getMessageId(body: any | any[]): string[] {
    if (Array.isArray(body)) {
      return body.map((item) => item._id);
    }

    return [body._id];
  }

  parseEventBody(
    body: any | any[],
    identifier: string
  ): IEmailEventBody | undefined {
    if (Array.isArray(body)) {
      body = body.find((item) => item._id === identifier);
    }

    if (!body) {
      return undefined;
    }

    const status = this.getStatus(body.event);

    if (status === undefined) {
      return undefined;
    }

    return {
      status: status,
      date: new Date().toISOString(),
      externalId: body._id,
      attempts: body.attempt ? parseInt(body.attempt, 10) : 1,
      response: body.response ? body.response : '',
      row: body,
    };
  }

  private getStatus(event: string): EmailEventStatusEnum | undefined {
    switch (event) {
      case MandrillStatusEnum.OPENED:
        return EmailEventStatusEnum.OPENED;
      case MandrillStatusEnum.HARD_BOUNCED:
        return EmailEventStatusEnum.BOUNCED;
      case MandrillStatusEnum.CLICKED:
        return EmailEventStatusEnum.CLICKED;
      case MandrillStatusEnum.SENT:
        return EmailEventStatusEnum.SENT;
      case MandrillStatusEnum.SPAM:
        return EmailEventStatusEnum.SPAM;
      case MandrillStatusEnum.REJECTED:
        return EmailEventStatusEnum.REJECTED;
      case MandrillStatusEnum.SOFT_BOUNCED:
        return EmailEventStatusEnum.BOUNCED;
      case MandrillStatusEnum.UNSUBSCRIBED:
        return EmailEventStatusEnum.UNSUBSCRIBED;
      case MandrillStatusEnum.DEFERRED:
        return EmailEventStatusEnum.DEFERRED;
      case MandrillStatusEnum.DELIVERED:
        return EmailEventStatusEnum.DELIVERED;
    }
  }
}
