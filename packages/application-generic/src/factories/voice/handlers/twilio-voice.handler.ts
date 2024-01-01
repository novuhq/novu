import { TwilioVoiceProvider } from '@novu/twilio-voice';
import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { BaseVoiceHandler } from './base.handler';

export class TwilioHandler extends BaseVoiceHandler {
  constructor() {
    super('twilio-voice', ChannelTypeEnum.VOICE);
  }
  buildProvider(credentials: ICredentials) {
    this.provider = new TwilioVoiceProvider({
      accountSid: credentials.accountSid,
      authToken: credentials.token,
      from: credentials.from,
    });
  }
}
