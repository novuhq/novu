import { IProviderConfig } from '../provider.interface';
import { ChannelTypeEnum } from '../../../entities/message-template';
import {
  gupshupConfig,
  nexmoConfig,
  plivoConfig,
  sms77Config,
  snsConfig,
  telnyxConfig,
  twilioConfig,
} from '../credentials';
import { SmsProviderIdEnum } from '../provider.enum';

export const smsProviders: IProviderConfig[] = [
  {
    id: SmsProviderIdEnum.Nexmo,
    displayName: 'Nexmo',
    channel: ChannelTypeEnum.SMS,
    credentials: nexmoConfig,
    docReference: 'https://developer.nexmo.com/api/sms?theme=dark',
    logoFileName: { light: 'nexmo.png', dark: 'nexmo.png' },
  },
  {
    id: SmsProviderIdEnum.Plivo,
    displayName: 'Plivo',
    channel: ChannelTypeEnum.SMS,
    credentials: plivoConfig,
    docReference: 'https://www.plivo.com/docs/',
    logoFileName: { light: 'plivo.png', dark: 'plivo.png' },
  },

  {
    id: SmsProviderIdEnum.Sms77,
    displayName: 'sms77',
    channel: ChannelTypeEnum.SMS,
    credentials: sms77Config,
    docReference: 'https://www.sms77.io/de/docs/gateway/http-api/',
    logoFileName: { light: 'sms77.svg', dark: 'sms77.svg' },
  },
  {
    id: SmsProviderIdEnum.SNS,
    displayName: 'SNS',
    channel: ChannelTypeEnum.SMS,
    credentials: snsConfig,
    docReference: 'https://docs.aws.amazon.com/sns/index.html',
    logoFileName: { light: 'sns.svg', dark: 'sns.svg' },
  },
  {
    id: SmsProviderIdEnum.Telnyx,
    displayName: 'Telnyx',
    channel: ChannelTypeEnum.SMS,
    credentials: telnyxConfig,
    docReference: 'https://developers.telnyx.com/',
    logoFileName: { light: 'telnyx.png', dark: 'telnyx.png' },
  },
  {
    id: SmsProviderIdEnum.Twilio,
    displayName: 'Twilio',
    channel: ChannelTypeEnum.SMS,
    credentials: twilioConfig,
    docReference: 'https://www.twilio.com/docs',
    logoFileName: { light: 'twilio.png', dark: 'twilio.png' },
  },
  {
    id: SmsProviderIdEnum.Gupshup,
    displayName: 'Gupshup',
    channel: ChannelTypeEnum.SMS,
    credentials: gupshupConfig,
    docReference: 'https://docs.gupshup.io/docs/send-single-message',
    logoFileName: { light: 'gupshup.png', dark: 'gupshup.png' },
  },
];
