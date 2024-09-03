import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';

import { Client, ApiController, MessageRequest } from '@bandwidth/messaging';
import { SmsProviderIdEnum } from '@novu/shared';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

export class BandwidthSmsProvider extends BaseProvider implements ISmsProvider {
  id = SmsProviderIdEnum.Bandwidth;
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  protected casing = CasingEnum.CAMEL_CASE;
  public controller: ApiController;

  constructor(
    private config: {
      username: string;
      password: string;
      accountId: string;
    },
  ) {
    super();
    const client = new Client({
      basicAuthUserName: config.username,
      basicAuthPassword: config.password,
    });
    this.controller = new ApiController(client);
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {},
  ): Promise<ISendMessageSuccessResponse> {
    const body = this.transform<MessageRequest>(bridgeProviderData, {
      applicationId: this.config.accountId,
      to: [options.to],
      from: options.from,
      text: options.content,
    });

    const createMessageResponse = await this.controller.createMessage(
      this.config.accountId,
      body.body,
    );

    return {
      id: createMessageResponse.result.id,
      date: createMessageResponse.result.time,
    };
  }
}
