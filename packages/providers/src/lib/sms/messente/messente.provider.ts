import * as messente from 'messente_api';

import { SmsProviderIdEnum } from "@novu/shared";
import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from "@novu/stateless";
import { BaseProvider, CasingEnum } from "../../../base.provider";
import { WithPassthrough } from "../../../utils/types";

type MessageChannel = 'sms' | 'viber' | 'whatsapp';

interface MessagePayload {
  readonly channel: MessageChannel;
  readonly text: string;
  readonly sender: string;
}

interface SendMessageRequest {
  readonly to: string;
  readonly messages: MessagePayload[];
}

interface MessageResponse {
  readonly channel: MessageChannel;
  readonly message_id: string;
  readonly sender: string;
}

interface SendMessageResponse {
  readonly to: string;
  readonly messages: MessageResponse[];
}

export class MessenteSmsProvider extends BaseProvider implements ISmsProvider {
  id = SmsProviderIdEnum.Messente;
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  protected casing: CasingEnum = CasingEnum.CAMEL_CASE;
  readonly #messente: messente.OmnimessageApi;

  constructor(private readonly config: {
    readonly username: string;
    readonly password: string;
  }) {
    super();

    const { instance } = messente.ApiClient;
    const basicAuth = instance.authentications["basicAuth"];

    basicAuth.username = config.username;
    basicAuth.password = config.password;
    
    this.#messente = new messente.OmnimessageApi();
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {},
  ): Promise<ISendMessageSuccessResponse> {
    const params = this.transform<SendMessageRequest>(bridgeProviderData, {
      to: options.to,
      messages: [
        {
          channel: 'sms',
          text: options.content,
          sender: options.from,
        },
      ],
    }).body;

    const response = await new Promise<SendMessageResponse>((resolve, reject) => {
      this.#messente.sendOmnimessage(
        {
          to: params.to,
          messages: params.messages,
        },
        (error: Error | null, data: SendMessageResponse) => {
          if (error) {
            reject(error);
          } else {
            resolve(data);
          }
        },
      );
    });

    const [{ message_id }] = response.messages;

    return {
      id: message_id,
      date: new Date().toISOString(),
    };
  }
}
