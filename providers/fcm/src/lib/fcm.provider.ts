import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  IPushOptions,
  IPushProvider,
} from '@novu/stateless';
import { initializeApp, cert } from 'firebase-admin/app';
import { getMessaging, Messaging } from 'firebase-admin/messaging';
import crypto from 'crypto';
import { MulticastMessage } from 'firebase-admin/lib/messaging';

export class FcmPushProvider implements IPushProvider {
  id = 'fcm';
  channelType = ChannelTypeEnum.PUSH as ChannelTypeEnum.PUSH;

  private messaging: Messaging;
  constructor(
    private config: {
      projectId: string;
      email: string;
      secretKey: string;
    }
  ) {
    this.config = config;
    const firebase = initializeApp(
      {
        credential: cert({
          projectId: this.config.projectId,
          clientEmail: this.config.email,
          privateKey: this.config.secretKey,
        }),
      },
      crypto.randomBytes(4).toString()
    );
    this.messaging = getMessaging(firebase);
  }

  async sendMessage(
    options: IPushOptions
  ): Promise<ISendMessageSuccessResponse> {
    delete (options.overrides as any)?.deviceTokens;

    const dataPayload = options.overrides.data;

    delete (options.overrides as any)?.data;

    const fcmPayload: MulticastMessage = {
      tokens: options.target,
      notification: {
        title: options.title,
        body: options.content,
        ...options.overrides,
      },
    };

    if (dataPayload) {
      fcmPayload.data = dataPayload;
    }

    const res = await this.messaging.sendMulticast(fcmPayload);

    return {
      ids: res?.responses?.map((response) => response.messageId),
      date: new Date().toISOString(),
    };
  }
}
