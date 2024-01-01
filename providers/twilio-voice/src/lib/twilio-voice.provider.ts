import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  IVoiceOptions,
  IVoiceProvider,
} from '@novu/stateless';

import { Twilio, twiml } from 'twilio';
import { SayAttributes } from 'twilio/lib/twiml/VoiceResponse';

export class TwilioVoiceProvider implements IVoiceProvider {
  id = 'twilio-voice';
  channelType = ChannelTypeEnum.VOICE as ChannelTypeEnum.VOICE;
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
    options: IVoiceOptions
  ): Promise<ISendMessageSuccessResponse> {
    const response = new twiml.VoiceResponse();
    response.say(
      {
        language: options.language as SayAttributes['language'],
        voice: options.voice as SayAttributes['voice'],
      },
      options.content
    );
    const twilioResponse = await this.twilioClient.calls.create({
      to: options.to,
      from: options.from || this.config.from,
      twiml: response,
      record: options.record,
    });

    return {
      id: twilioResponse.sid,
      date: new Date().toISOString(),
    };
  }
}
