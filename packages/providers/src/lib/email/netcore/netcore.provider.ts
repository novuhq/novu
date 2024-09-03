import { EmailProviderIdEnum } from '@novu/shared';
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
import axios, { AxiosInstance } from 'axios';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';
import { IEmailBody, IEmailResponse } from './netcore-types';

export enum NetCoreStatusEnum {
  OPENED = 'open',
  SENT = 'send',
  BOUNCED = 'bounce',
  INVALID = 'invalid',
  DROPPED = 'drop',
  CLICKED = 'click',
  SPAM = 'spam',
  UNSUBSCRIBED = 'unsub',
}

export class NetCoreProvider extends BaseProvider implements IEmailProvider {
  id = EmailProviderIdEnum.NetCore;
  protected casing: CasingEnum = CasingEnum.SNAKE_CASE;
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;
  public readonly BASE_URL = 'https://emailapi.netcorecloud.net/v5.1';
  private axiosInstance: AxiosInstance;

  constructor(
    private config: {
      apiKey: string;
      from: string;
      senderName: string;
    },
  ) {
    super();
    this.axiosInstance = axios.create({
      baseURL: this.BASE_URL,
    });
  }

  async sendMessage(
    options: IEmailOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {},
  ): Promise<ISendMessageSuccessResponse> {
    const data: IEmailBody = this.transform<IEmailBody>(bridgeProviderData, {
      from: {
        email: options.from || this.config.from,
        name: options.senderName || this.config.senderName,
      },
      subject: options.subject,
      content: [
        {
          type: 'html',
          value: options.html,
        },
      ],
      personalizations: [
        {
          to: options.to.map((email) => ({ email })),
        },
      ],
    }).body;

    if (options.replyTo) {
      data.reply_to = options.replyTo;
    }

    if (options.cc) {
      data.personalizations[0].cc = options.cc.map((email) => ({
        email,
      }));
    }

    if (options.bcc) {
      data.personalizations[0].bcc = options.bcc.map((email) => ({
        email,
      }));
    }

    if (options.attachments) {
      data.personalizations[0].attachments = options.attachments?.map(
        (attachment) => {
          return {
            name: attachment.name,
            content: attachment.file.toString('base64'),
          };
        },
      );
    }

    const emailOptions = {
      method: 'POST',
      url: '/mail/send',
      headers: {
        api_key: this.config.apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      data: JSON.stringify(data),
    };

    const response =
      await this.axiosInstance.request<IEmailResponse>(emailOptions);

    return {
      id: response?.data.data?.message_id,
      date: new Date().toISOString(),
    };
  }

  async checkIntegration(
    options: IEmailOptions,
  ): Promise<ICheckIntegrationResponse> {
    return {
      success: true,
      message: 'Integrated successfully!',
      code: CheckIntegrationResponseEnum.SUCCESS,
    };
  }

  getMessageId(body: any | any[]): string[] {
    if (Array.isArray(body)) {
      return body.map((item) => item.TRANSID);
    }

    return [body.TRANSID];
  }

  parseEventBody(
    body: any | any[],
    identifier: string,
  ): IEmailEventBody | undefined {
    if (Array.isArray(body)) {
      // eslint-disable-next-line no-param-reassign
      body = body.find((item) => item.TRANSID === identifier);
    }

    if (!body) {
      return undefined;
    }

    const status = this.getStatus(body.EVENT);

    if (status === undefined) {
      return undefined;
    }

    return {
      status,
      date: new Date(body.TIMESTAMP).toISOString(),
      externalId: body.TRANSID,
      attempts: body.attempt ? parseInt(body.attempt, 10) : 1,
      response: body.response ?? '',
      row: body,
    };
  }

  private getStatus(event: string): EmailEventStatusEnum | undefined {
    switch (event) {
      case NetCoreStatusEnum.OPENED:
        return EmailEventStatusEnum.OPENED;
      case NetCoreStatusEnum.INVALID:
      case NetCoreStatusEnum.BOUNCED:
        return EmailEventStatusEnum.BOUNCED;
      case NetCoreStatusEnum.CLICKED:
        return EmailEventStatusEnum.CLICKED;
      case NetCoreStatusEnum.SENT:
        return EmailEventStatusEnum.SENT;
      case NetCoreStatusEnum.SPAM:
        return EmailEventStatusEnum.SPAM;
      case NetCoreStatusEnum.UNSUBSCRIBED:
        return EmailEventStatusEnum.UNSUBSCRIBED;
      case NetCoreStatusEnum.DROPPED:
        return EmailEventStatusEnum.DROPPED;
      default:
        return undefined;
    }
  }
}
