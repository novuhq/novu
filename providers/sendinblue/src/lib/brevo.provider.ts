import { ProxyAgent } from 'proxy-agent';
import 'cross-fetch';

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

declare global {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  interface RequestInit {
    agent: ProxyAgent;
  }
}

export class BrevoEmailProvider implements IEmailProvider {
  id = 'sendinblue';
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;
  public readonly BASE_URL = 'https://api.brevo.com/v3';

  constructor(
    private config: {
      apiKey: string;
      from: string;
      senderName: string;
    }
  ) {}

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

    const response = await fetch(`${this.BASE_URL}/smtp/email`, {
      method: 'POST',
      headers: {
        'api-key': this.config.apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      agent: new ProxyAgent(),
      body: JSON.stringify(email),
    });

    const body: { messageId: string } = await response.json();

    return {
      id: body.messageId,
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
