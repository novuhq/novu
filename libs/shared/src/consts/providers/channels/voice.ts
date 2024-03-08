import { IProviderConfig } from '../provider.interface';
import { twilioConfig } from '../credentials';

import { VoiceProviderIdEnum } from '../provider.enum';

import { ChannelTypeEnum } from '../../../types';

export const voiceProviders: IProviderConfig[] = [
  {
    id: VoiceProviderIdEnum.Twilio,
    displayName: 'Twilio',
    channel: ChannelTypeEnum.VOICE,
    credentials: twilioConfig,
    docReference: 'https://docs.novu.co/channels-and-providers/voice/twilio',
    logoFileName: { light: 'twilio.png', dark: 'twilio.png' },
  },
];
