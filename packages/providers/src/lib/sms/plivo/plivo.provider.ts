import { SmsProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISMSEventBody,
  ISmsOptions,
  ISmsProvider,
  SmsEventStatusEnum,
} from '@novu/stateless';

import plivo from 'plivo';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

export class PlivoSmsProvider extends BaseProvider implements ISmsProvider {
  id = SmsProviderIdEnum.Plivo;
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  protected casing = CasingEnum.CAMEL_CASE;
  private plivoClient: plivo.Client;

  constructor(
    private config: {
      accountSid?: string;
      authToken?: string;
      from?: string;
    }
  ) {
    super();
    this.plivoClient = new plivo.Client(config.accountSid, config.authToken);
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const transformedData = this.transform(bridgeProviderData, {
      from: options.from || this.config.from,
      to: options.to,
      text: options.content,
    });
    const plivoResponse = await this.plivoClient.messages.create(
      transformedData.body.from,
      transformedData.body.to,
      transformedData.body.text as string,
      transformedData.body.optionalParams as object,
      transformedData.body.powerpackUUID as string
    );

    return {
      ids: plivoResponse.messageUuid,
      date: new Date().toISOString(),
    };
  }

  getMessageId(body: any | any[]): string[] {
    if (Array.isArray(body)) {
      return body.map((item) => item.messageUuid);
    }

    return [body.messageUuid];
  }

  parseEventBody(
    body: any | any[],
    identifier: string
  ): ISMSEventBody | undefined {
    if (Array.isArray(body)) {
      body = body.find((item) => item.messageUuid === identifier);
    }

    if (!body) {
      return undefined;
    }

    const status = this.getStatus(body.status);

    if (status === undefined) {
      return undefined;
    }

    return {
      status: status,
      date: new Date().toISOString(),
      externalId: body.messageUuid,
      attempts: body.attempt ? parseInt(body.attempt, 10) : 1,
      response: body.response ?? '',
      row: body,
    };
  }

  private getStatus(event: string): SmsEventStatusEnum | undefined {
    switch (event) {
      case 'queued':
        return SmsEventStatusEnum.QUEUED;
      case 'sent':
        return SmsEventStatusEnum.SENT;
      case 'failed':
        return SmsEventStatusEnum.FAILED;
      case 'undelivered':
        return SmsEventStatusEnum.UNDELIVERED;
      case 'delivered':
        return SmsEventStatusEnum.DELIVERED;
      case 'rejected':
        return SmsEventStatusEnum.REJECTED;
    }
  }
}
