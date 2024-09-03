import { SmsProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
  SmsEventStatusEnum,
  ISMSEventBody,
} from '@novu/stateless';

import Telnyx from 'telnyx';
import { BaseProvider, CasingEnum } from '../../../base.provider';

import { ITelnyxCLient } from './telnyx.interface';
import { WithPassthrough } from '../../../utils/types';

export class TelnyxSmsProvider extends BaseProvider implements ISmsProvider {
  id = SmsProviderIdEnum.Telnyx;
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  protected casing = CasingEnum.SNAKE_CASE;
  private telnyxClient: ITelnyxCLient;

  constructor(
    private config: {
      apiKey?: string;
      from?: string;
      messageProfileId?: string;
    },
  ) {
    super();
    this.telnyxClient = Telnyx(config.apiKey);
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {},
  ): Promise<ISendMessageSuccessResponse> {
    const telynxResponse = await this.telnyxClient.messages.create(
      this.transform<any>(bridgeProviderData, {
        to: options.to,
        text: options.content,
        from: options.from || this.config.from,
        messaging_profile_id: this.config.messageProfileId,
      }).body,
    );

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
    identifier: string,
  ): ISMSEventBody | undefined {
    if (Array.isArray(body)) {
      // eslint-disable-next-line no-param-reassign
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
      status,
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
      default:
        return undefined;
    }
  }
}
