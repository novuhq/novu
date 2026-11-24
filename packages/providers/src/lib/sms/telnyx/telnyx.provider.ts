import { SmsProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISMSEventBody,
  ISmsOptions,
  ISmsProvider,
  IVerifyCredentialsResponse,
  SmsEventStatusEnum,
} from '@novu/stateless';

import Telnyx from 'telnyx';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { createProviderHttpClient } from '../../../utils/http';
import { WithPassthrough } from '../../../utils/types';
import { VERIFY_CREDENTIALS_TIMEOUT_MS, verifyCredentialsWith } from '../../../utils/verify-credentials';
import { ITelnyxCLient } from './telnyx.interface';

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
    }
  ) {
    super();
    this.telnyxClient = Telnyx(config.apiKey);
  }

  /** Reads the account balance (`GET /v2/balance`): read-only, and any valid API key can call it. */
  async verifyCredentials(): Promise<IVerifyCredentialsResponse> {
    return verifyCredentialsWith(() =>
      createProviderHttpClient({ timeoutMs: VERIFY_CREDENTIALS_TIMEOUT_MS }).get('https://api.telnyx.com/v2/balance', {
        headers: { Authorization: `Bearer ${this.config.apiKey}` },
      })
    );
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const telynxResponse = await this.telnyxClient.messages.create(
      // biome-ignore lint/suspicious/noExplicitAny: pre-existing; provider SDK request type differs from the transformed body
      this.transform<any>(bridgeProviderData, {
        to: options.to,
        text: options.content,
        from: options.from || this.config.from,
        messaging_profile_id: this.config.messageProfileId,
      }).body
    );

    return {
      id: telynxResponse.data.id,
      date: telynxResponse.data.received_at.toString(),
    };
  }

  // biome-ignore lint/suspicious/noExplicitAny: pre-existing; untyped provider webhook payload
  getMessageId(body: any | any[]): string[] {
    if (Array.isArray(body)) {
      return body.map((item) => item.data.id);
    }

    return [body.data.id];
  }

  // biome-ignore lint/suspicious/noExplicitAny: pre-existing; untyped provider webhook payload
  parseEventBody(body: any | any[], identifier: string): ISMSEventBody | undefined {
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
