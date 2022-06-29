import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  IPushOptions,
  IPushProvider,
} from '@novu/stateless';
import { cert } from 'firebase-admin/app';
import { initializeApp } from 'firebase-admin/app';
import { getMessaging, Messaging } from 'firebase-admin/messaging';
import crypto from 'crypto';

export class FcmPushProvider implements IPushProvider {
  id = 'fcm';
  channelType = ChannelTypeEnum.PUSH as ChannelTypeEnum.PUSH;

  private messaging: Messaging;
  constructor(
    private config: {
      secretKey: string;
    }
  ) {
    this.config = config;
    const firebase = initializeApp(
      {
        credential: cert(JSON.parse(this.config.secretKey)),
      },
      crypto.randomBytes(4).toString()
    );
    this.messaging = getMessaging(firebase);
  }

  async sendMessage(
    options: IPushOptions
  ): Promise<ISendMessageSuccessResponse> {
    const res = await this.messaging.sendToDevice(options.target, {
      notification: {
        title: options.title,
        sound: 'default',
        body: options.content,
        ...options.payload,
      },
    });
    console.log(res);
    return {
      id: 'PLACEHOLDER',
      date: 'PLACEHOLDER',
    };
  }
}
