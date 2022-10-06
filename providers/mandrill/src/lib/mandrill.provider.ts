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
import { MandrillInterface } from './mandrill.interface';

export class MandrillProvider implements IEmailProvider {
  id = 'mandrill';
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;

  private transporter: MandrillInterface;

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

  async checkIntegration(
    options: IEmailOptions
  ): Promise<ICheckIntegrationResponse> {
    return {
      success: true,
      message: 'Integrated successfully!',
      code: CheckIntegrationResponseEnum.SUCCESS,
    };
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
      case 'open':
        return EmailEventStatusEnum.OPENED;
      case 'hard_bounce':
        return EmailEventStatusEnum.BOUNCED;
      case 'click':
        return EmailEventStatusEnum.CLICKED;
      case 'send':
        return EmailEventStatusEnum.SENT;
      case 'spam':
        return EmailEventStatusEnum.SPAM;
    }
  }
}
