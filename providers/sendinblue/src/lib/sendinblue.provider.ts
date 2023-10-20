import {
  ChannelTypeEnum,
  CheckIntegrationResponseEnum,
  EmailEventStatusEnum,
  ICheckIntegrationResponse,
  IEmailEventBody,
  IEmailOptions,
  IEmailProvider,
  ISendMessageSuccessResponse,
} from '@novu/stateless';
import axios, { AxiosInstance } from 'axios';

export class SendinblueEmailProvider implements IEmailProvider {
  id = 'sendinblue';
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;
  public readonly BASE_URL = 'https://api.brevo.com/v3';
  private axiosInstance: AxiosInstance;

  constructor(
    private config: {
      apiKey: string;
      from: string;
      senderName: string;
    }
  ) {
    this.axiosInstance = axios.create({
      baseURL: this.BASE_URL,
    });
  }

  async sendMessage(
    options: IEmailOptions
  ): Promise<ISendMessageSuccessResponse> {
    const emailOptions = {
      method: 'POST',
      headers: {
        'api-key': this.config.apiKey,
        accept: 'application/json',
        'content-type': 'application/json',
      },
      data: {
        sender: {
          name: options.from || this.config.from,
          email: this.config.senderName,
        },
        to: getFormattedTo(options.to),
        bcc: options.bcc?.map((bccItem) => ({ email: bccItem })),
        cc: options.cc?.map((ccItem) => ({ email: ccItem })),
        replyTo: {
          email: options.replyTo,
        },
        htmlContent: options.html,
        textContent: options.text,
        subject: options.subject,
        attachment: options.attachments?.map((attachment) => ({
          name: attachment?.name,
          content: attachment?.file.toString('base64'),
        })),
      },
    };

    const response = await this.axiosInstance.post('/smtp/email', emailOptions);

    return {
      id: response.data?.messageId,
      date: response?.headers?.date,
    };
  }

  getMessageId(body: any | any[]): string[] {
    if (Array.isArray(body)) {
      return body.map((item) => item['message-id']);
    }

    return [body['message-id']];
  }

  parseEventBody(
    body: any | any[],
    identifier: string
  ): IEmailEventBody | undefined {
    if (Array.isArray(body)) {
      body = body.find((item) => item['message-id'] === identifier);
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
      date: new Date(body.date).toISOString(),
      externalId: body.id,
      row: body,
    };
  }

  private getStatus(event: string): EmailEventStatusEnum | undefined {
    switch (event) {
      case 'opened':
      case 'uniqueOpened':
      case 'proxy_open':
        return EmailEventStatusEnum.OPENED;
      case 'request':
      case 'delivered':
      case 'complaint':
        return EmailEventStatusEnum.DELIVERED;
      case 'hardBounce':
      case 'softBounce':
      case 'blocked':
      case 'unsubscribed':
        return EmailEventStatusEnum.BOUNCED;
      case 'click':
        return EmailEventStatusEnum.CLICKED;
      case 'invalid_email':
      case 'error':
        return EmailEventStatusEnum.DROPPED;
      // case 'deferred':
    }
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
}

function getFormattedTo(to: string | string[]): { email: string }[] {
  if (typeof to === 'string') {
    return [{ email: to }];
  }

  return to.map((email: string) => ({ email }));
}
