import { SmsProviderIdEnum } from '@novu/shared';
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
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

export class RingCentralSmsProvider
  extends BaseProvider
  implements ISmsProvider
{
  id = SmsProviderIdEnum.RingCentral;
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  protected casing = CasingEnum.CAMEL_CASE;
  sendSMSEndpoint = '/restapi/v1.0/account/~/extension/~/sms';
  private rcClient: Platform;

  constructor(
    private config: {
      clientId?: string;
      clientSecret?: string;
      isSandBox?: boolean;
      jwtToken?: string;
      from?: string;
    },
  ) {
    super();
    const rcSdk = new SDK({
      server: config.isSandBox ? SDK.server.sandbox : SDK.server.production,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
    });
    this.rcClient = rcSdk.platform();
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {},
  ): Promise<ISendMessageSuccessResponse> {
    const bodyParams = this.transform(bridgeProviderData, {
      from: { phoneNumber: options.from || this.config.from },
      to: [{ phoneNumber: options.to }],
      text: options.content,
    }).body;

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
    identifier: string,
  ): ISMSEventBody | undefined {
    if (Array.isArray(body)) {
      // eslint-disable-next-line no-param-reassign
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
      status,
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
      default:
        return undefined;
    }
  }
}
