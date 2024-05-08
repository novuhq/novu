import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISMSEventBody,
  ISmsOptions,
  ISmsProvider,
  SmsEventStatusEnum,
} from '@novu/stateless';

import { Twilio } from 'twilio';

export class TwilioSmsProvider implements ISmsProvider {
  id = 'twilio';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  private twilioClient: Twilio;

  constructor(
    private config: {
      accountSid?: string;
      authToken?: string;
      from?: string;
    }
  ) {
    this.twilioClient = new Twilio(config.accountSid, config.authToken);
  }

  async sendMessage(
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
    const twilioResponse = await this.twilioClient.messages.create({
      body: options.content,
      to: options.to,
      from: options.from || this.config.from,
    });

    return {
      id: twilioResponse.sid,
      date: twilioResponse.dateCreated.toISOString(),
    };
  }

  getMessageId(body: any | any[]): string[] {
    if (Array.isArray(body)) {
      return body.map((item) => item.MessageSid);
    }

    return [body.MessageSid];
  }

  parseEventBody(
    body: any | any[],
    identifier: string
  ): ISMSEventBody | undefined {
    if (Array.isArray(body)) {
      body = body.find((item) => item.MessageSid === identifier);
    }

    if (!body) {
      return undefined;
    }

    const status = this.getStatus(body.MessageStatus);

    if (status === undefined) {
      return undefined;
    }

    return {
      status: status,
      date: new Date().toISOString(),
      externalId: body.MessageSid,
      attempts: body.attempt ? parseInt(body.attempt, 10) : 1,
      response: body.response ? body.response : '',
      row: body,
    };
  }

  private getStatus(event: string): SmsEventStatusEnum | undefined {
    switch (event) {
      case 'accepted':
        return SmsEventStatusEnum.ACCEPTED;
      case 'queued':
        return SmsEventStatusEnum.QUEUED;
      case 'sending':
        return SmsEventStatusEnum.SENDING;
      case 'sent':
        return SmsEventStatusEnum.SENT;
      case 'failed':
        return SmsEventStatusEnum.FAILED;
      case 'delivered':
        return SmsEventStatusEnum.DELIVERED;
      case 'undelivered':
        return SmsEventStatusEnum.UNDELIVERED;
    }
  }
}
