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

import { Client as PlivoClient } from 'plivo';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { createProviderHttpClient } from '../../../utils/http';
import { WithPassthrough } from '../../../utils/types';
import { VERIFY_CREDENTIALS_TIMEOUT_MS, verifyCredentialsWith } from '../../../utils/verify-credentials';

export class PlivoSmsProvider extends BaseProvider implements ISmsProvider {
  id = SmsProviderIdEnum.Plivo;
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  protected casing = CasingEnum.CAMEL_CASE;
  private plivoClient: PlivoClient;

  constructor(
    private config: {
      accountSid?: string;
      authToken?: string;
      from?: string;
    }
  ) {
    super();
    this.plivoClient = new PlivoClient(config.accountSid, config.authToken);
  }

  /** Reads the account details (`GET /v1/Account/{authId}/`), which any valid Auth ID/token pair can do. */
  async verifyCredentials(): Promise<IVerifyCredentialsResponse> {
    const authId = this.config.accountSid ?? '';

    return verifyCredentialsWith(() =>
      createProviderHttpClient({ timeoutMs: VERIFY_CREDENTIALS_TIMEOUT_MS }).get(
        `https://api.plivo.com/v1/Account/${encodeURIComponent(authId)}/`,
        { auth: { username: authId, password: this.config.authToken ?? '' } }
      )
    );
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const transformedData = this.transform(bridgeProviderData, {
      src: options.from || this.config.from,
      dst: options.to,
      text: options.content,
    });
    const plivoResponse = await this.plivoClient.messages.create(
      transformedData.body.src,
      transformedData.body.dst,
      transformedData.body.text as string,
      transformedData.body.optionalParams as object,
      transformedData.body.powerpackUUID as string
    );

    return {
      ids: plivoResponse.messageUuid,
      date: new Date().toISOString(),
    };
  }

  // biome-ignore lint/suspicious/noExplicitAny: pre-existing; untyped provider webhook payload
  getMessageId(body: any | any[]): string[] {
    if (Array.isArray(body)) {
      return body.map((item) => item.messageUuid);
    }

    return [body.messageUuid];
  }

  // biome-ignore lint/suspicious/noExplicitAny: pre-existing; untyped provider webhook payload
  parseEventBody(body: any | any[], identifier: string): ISMSEventBody | undefined {
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
      status,
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
      default:
        return undefined;
    }
  }
}
