import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
  SmsEventStatusEnum,
  ISMSEventBody,
} from '@novu/stateless';
import { ZenviaParams } from '../types/param';
import axios from 'axios';

export class ZenviaProvider implements ISmsProvider {
  id = 'zenvia';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  private axiosInstance = axios.create();

  constructor(
    private config: {
      apiKey: string;
    }
  ) {}

  async sendMessage(
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
    let response = {};

    const contentParse = JSON.parse(options.content);

    switch (contentParse.type_provider) {
      case 'SMS':
        response = this.sendSMS(options);
        break;
      case 'WHATSAPP':
        response = this.sendWhatsapp(options);
        break;
      default:
        return undefined;
    }

    return response;
  }

  getMessageId(body: any | any[]): string[] {
    if (Array.isArray(body)) {
      return body.map((item) => item.messageId);
    }

    return [body.messageId];
  }

  parseEventBody(
    body: any | any[],
    identifier: string
  ): ISMSEventBody | undefined {
    if (Array.isArray(body)) {
      body = body.find((item) => item.messageId === identifier);
    }

    if (!body) {
      return undefined;
    }

    const status = this.getStatus(body.messageStatus.code);

    if (status === undefined) {
      return undefined;
    }

    return {
      status: status,
      date: new Date().toISOString(),
      externalId: body.messageId,
      response: body.response ? body.response : '',
      row: body,
    };
  }

  private getStatus(event: string): SmsEventStatusEnum | undefined {
    switch (event) {
      case 'SENT':
        return SmsEventStatusEnum.SENT;
      case 'DELIVERED':
        return SmsEventStatusEnum.DELIVERED;
      case 'READ':
        return SmsEventStatusEnum.DELIVERED;
      case 'DELETED':
        return SmsEventStatusEnum.DELIVERED;
      case 'CLICKED':
        return SmsEventStatusEnum.DELIVERED;
      case 'VERIFIED':
        return SmsEventStatusEnum.DELIVERED;
      case 'NOT_DELIVERED':
        return SmsEventStatusEnum.UNDELIVERED;
      case 'REJECTED':
        return SmsEventStatusEnum.REJECTED;
    }
  }

  private async sendWhatsapp(
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
    const BASE_URL = 'https://api.zenvia.com/v2/channels/whatsapp/messages';

    const contentParse = JSON.parse(options.content);

    const data: ZenviaParams = {
      from: contentParse.from,
      to: options.to,
      contents: contentParse.contents,
    };

    const header = {
      headers: {
        'X-API-TOKEN': this.config.apiKey,
        'Content-Type': 'application/json',
      },
    };

    const url = `${BASE_URL}`;
    const response = await this.axiosInstance.post(url, data, header);

    return {
      id: response.data.id,
      date: new Date().toISOString(),
    };
  }

  private async sendSMS(
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
    const BASE_URL = 'https://api.zenvia.com/v2/channels/sms/messages';

    const contentParse = JSON.parse(options.content);

    const data: ZenviaParams = {
      from: contentParse.from,
      to: options.to,
      contents: contentParse.contents,
    };

    const header = {
      headers: {
        'X-API-TOKEN': this.config.apiKey,
        'Content-Type': 'application/json',
      },
    };

    const url = `${BASE_URL}`;
    const response = await this.axiosInstance.post(url, data, header);

    return {
      id: response.data.id,
      date: new Date().toISOString(),
    };
  }
}
