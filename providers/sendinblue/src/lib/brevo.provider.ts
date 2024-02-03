import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

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

export class BrevoEmailProvider implements IEmailProvider {
  id = 'sendinblue';
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;
  private axiosInstance: AxiosInstance;
  public readonly BASE_URL = 'https://api.brevo.com/v3';

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
    const email: any = {};
    email.sender = {
      email: options.from || this.config.from,
      name: options.senderName || this.config.senderName,
    };
    email.templateId = options.customData?.templateId;
    email.params = options.customData?.templateParams;
    email.to = getFormattedTo(options.to);
    email.subject = options.subject;
    email.htmlContent = options.html;
    email.textContent = options.text;
    email.attachment = options.attachments?.map((attachment) => ({
      name: attachment?.name,
      content: attachment?.file.toString('base64'),
    }));

    if (options.cc?.length) {
      email.cc = options.cc?.map((ccItem) => ({ email: ccItem }));
    }

    if (options?.bcc?.length) {
      email.bcc = options.bcc?.map((ccItem) => ({ email: ccItem }));
    }

    if (options.replyTo) {
      email.replyTo = {
        email: options.replyTo,
      };
    }

    const emailOptions: AxiosRequestConfig = {
      url: '/smtp/email',
      method: 'POST',
      headers: {
        'api-key': this.config.apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      data: JSON.stringify(email),
    };

    const response = await this.axiosInstance.request<{ messageId: string }>(
      emailOptions
    );

    return {
      id: response?.data.messageId,
      date: new Date().toISOString(),
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
