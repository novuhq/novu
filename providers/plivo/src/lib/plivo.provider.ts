import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISMSEventBody,
  ISmsOptions,
  ISmsProvider,
  SmsEventStatusEnum,
} from '@novu/stateless';

import * as plivo from 'plivo';

export class PlivoSmsProvider implements ISmsProvider {
  id = 'plivo';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  private plivoClient: plivo.Client;

  constructor(
    private config: {
      accountSid?: string;
      authToken?: string;
      from?: string;
    }
  ) {
    this.plivoClient = new plivo.Client(config.accountSid, config.authToken);
  }

  async sendMessage(
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
    const plivoResponse = await this.plivoClient.messages.create(
      options.from || this.config.from,
      options.to,
      options.content
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
