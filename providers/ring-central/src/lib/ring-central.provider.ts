import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISMSEventBody,
  ISmsOptions,
  ISmsProvider,
  SmsEventStatusEnum,
} from '@novu/stateless';
import { SDK } from '@ringcentral/sdk';
import Platform from '@ringcentral/sdk/lib/platform/Platform';

export class RingCentralSmsProvider implements ISmsProvider {
  id = 'ring-central';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  sendSMSEndpoint = '/restapi/v1.0/account/~/extension/~/sms';
  private rcClient: Platform;

  constructor(
    private config: {
      clientId?: string;
      clientSecret?: string;
      isSandBox?: boolean;
      jwtToken?: string;
      from?: string;
    }
  ) {
    const rcSdk = new SDK({
      server: config.isSandBox ? SDK.server.sandbox : SDK.server.production,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
    });
    this.rcClient = rcSdk.platform();
  }

  async sendMessage(
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
    const bodyParams = {
      from: { phoneNumber: options.from || this.config.from },
      to: [{ phoneNumber: options.to }],
      text: options.content,
    };

    if (!(await this.rcClient.loggedIn())) {
      await this.rcClient.login({ jwt: this.config.jwtToken });
    }

    const resp = await this.rcClient.post(this.sendSMSEndpoint, bodyParams);
    const jsonObj = await resp.json();

    return {
      id: jsonObj.id,
      date: jsonObj.creationTime,
    };
  }

  getMessageId(body: any | any[]): string[] {
    if (Array.isArray(body)) {
      return body.map((item) => item.id);
    }

    return [body.id];
  }

  parseEventBody(
    body: any | any[],
    identifier: string
  ): ISMSEventBody | undefined {
    if (Array.isArray(body)) {
      body = body.find((item) => item.id === identifier);
    }

    if (!body) {
      return undefined;
    }

    const status = this.getStatus(body.messageStatus);

    if (status === undefined) {
      return undefined;
    }

    return {
      status: status,
      date: new Date(body.creationTime).toISOString(),
      externalId: body.id,
      attempts: body.smsSendingAttemptsCount
        ? parseInt(body.smsSendingAttemptsCount, 10)
        : 1,
      response: body.subject ? body.subject : '',
      row: body,
    };
  }

  private getStatus(event: string): SmsEventStatusEnum | undefined {
    switch (event) {
      case 'Received':
        return SmsEventStatusEnum.ACCEPTED;
      case 'Queued':
        return SmsEventStatusEnum.QUEUED;
      case 'Sent':
        return SmsEventStatusEnum.SENT;
      case 'DeliveryFailed':
      case 'SendingFailed':
        return SmsEventStatusEnum.FAILED;
      case 'Delivered':
        return SmsEventStatusEnum.DELIVERED;
    }
  }
}
