import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
  SmsEventStatusEnum,
  ISMSEventBody,
} from '@novu/stateless';

import Telnyx from 'telnyx';

import { ITelnyxCLient } from './telnyx.interface';

export class TelnyxSmsProvider implements ISmsProvider {
  id = 'telnyx';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  private telnyxClient: ITelnyxCLient;

  constructor(
    private config: {
      apiKey?: string;
      from?: string;
      messageProfileId?: string;
    }
  ) {
    this.telnyxClient = Telnyx(config.apiKey);
  }

  async sendMessage(
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
    const telynxResponse = await this.telnyxClient.messages.create({
      to: options.to,
      text: options.content,
      from: options.from || this.config.from,
      messaging_profile_id: this.config.messageProfileId,
    });

    return {
      id: telynxResponse.data.id,
      date: telynxResponse.data.received_at.toString(),
    };
  }

  getMessageId(body: any | any[]): string[] {
    if (Array.isArray(body)) {
      return body.map((item) => item.data.id);
    }

    return [body.data.id];
  }

  parseEventBody(
    body: any | any[],
    identifier: string
  ): ISMSEventBody | undefined {
    if (Array.isArray(body)) {
      body = body.find((item) => item.data.id === identifier);
    }

    if (!body) {
      return undefined;
    }

    const status = this.getStatus(body.data.payload.to[0].status);

    if (status === undefined) {
      return undefined;
    }

    return {
      status: status,
      date: new Date().toISOString(),
      externalId: body.data.id,
      attempts: body.attempt ? parseInt(body.attempt, 10) : 1,
      response: body.response ? body.response : '',
      row: body,
    };
  }

  private getStatus(event: string): SmsEventStatusEnum | undefined {
    switch (event) {
      case 'queued':
        return SmsEventStatusEnum.QUEUED;
      case 'sending':
        return SmsEventStatusEnum.SENDING;
      case 'sent':
        return SmsEventStatusEnum.SENT;
      case 'sending_failed':
      case 'delivery_failed':
        return SmsEventStatusEnum.FAILED;
      case 'delivered':
        return SmsEventStatusEnum.DELIVERED;
      case 'delivery_unconfirmed':
        return SmsEventStatusEnum.UNDELIVERED;
    }
  }
}
