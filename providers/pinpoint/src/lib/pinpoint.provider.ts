import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsProvider,
  ISmsOptions,
} from '@novu/stateless';
import {
  PinpointSMSVoiceV2Client,
  SendTextMessageCommand,
} from '@aws-sdk/client-pinpoint-sms-voice-v2';
import { PinpointConfig } from './pinpoint.config';

export class PinpointSMSProvider implements ISmsProvider {
  id = 'pinpoint';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  private readonly pinpoint: PinpointSMSVoiceV2Client;

  constructor(private readonly config: PinpointConfig) {
    this.pinpoint = new PinpointSMSVoiceV2Client({
      region: this.config.region,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
    });
  }

  async sendMessage(
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
    const pinpointResponse = await this.pinpoint.send(
      new SendTextMessageCommand({
        DestinationPhoneNumber: options.to,
        MessageBody: options.content,
        MessageType: 'TRANSACTIONAL',
        OriginationIdentity: options.from,
      })
    );

    return {
      id: pinpointResponse.MessageId,
      date: new Date().toISOString(),
    };
  }
}
