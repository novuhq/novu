import { ChannelTypeEnum } from '../../entities/message-template';

export interface IProviderConfig {
  id: string;
  displayName: string;
  channel: ChannelTypeEnum;
  credentials: {
    key: string;
    type: string;
  }[];
  comingSoon?: boolean;
}

export const mailJsConfig = [
  {
    key: 'apiKey',
    type: 'string',
  },
  {
    key: 'secret',
    type: 'string',
  },
];

export const mailgunConfig = [
  {
    key: 'apiKey',
    type: 'string',
  },
  {
    key: 'username',
    type: 'string',
  },
  {
    key: 'domain',
    type: 'string',
  },
  {
    key: 'from',
    type: 'string',
  },
];

export const mailjetConfig = [
  {
    key: 'apiKey',
    type: 'string',
  },
  {
    key: 'apiSecret',
    type: 'string',
  },
  {
    key: 'from',
    type: 'string',
  },
];

export const nexmoConfig = [
  {
    key: 'apiKey',
    type: 'string',
  },
  {
    key: 'apiSecret',
    type: 'string',
  },
  {
    key: 'from',
    type: 'string',
  },
];

export const mandrillConfig = [
  {
    key: 'apiKey',
    type: 'string',
  },
  {
    key: 'from',
    type: 'string',
  },
];

export const nodemailerConfig = [
  {
    key: 'from',
    type: 'string',
  },
  {
    key: 'host',
    type: 'string',
  },
  {
    key: 'port',
    type: 'number',
  },
  {
    key: 'secure',
    type: 'boolean',
  },
  {
    key: 'user',
    type: 'string',
  },
  {
    key: 'password',
    type: 'string',
  },
];

export const postmarkConfig = [
  {
    key: 'apiKey',
    type: 'string',
  },
  {
    key: 'from',
    type: 'string',
  },
];

export const sendgridConfig = [
  {
    key: 'apiKey',
    type: 'string',
  },
  {
    key: 'from',
    type: 'string',
  },
];

export const sendinblueConfig = [
  {
    key: 'apiKey',
    type: 'string',
  },
];

export const sesConfig = [
  {
    key: 'region',
    type: 'string',
  },
  {
    key: 'accessKeyId',
    type: 'string',
  },
  {
    key: 'secretAccessKey',
    type: 'string',
  },
  {
    key: 'from',
    type: 'string',
  },
];

export const plivoConfig = [
  {
    key: 'accountSid',
    type: 'string',
  },
  {
    key: 'authToken',
    type: 'string',
  },
  {
    key: 'from',
    type: 'string',
  },
];

export const sms77Config = [
  {
    key: 'apiKey',
    type: 'string',
  },
  {
    key: 'from',
    type: 'string',
  },
];

export const snsConfig = [
  {
    key: 'accessKeyId',
    type: 'string',
  },
  {
    key: 'secretAccessKey',
    type: 'string',
  },
];

export const telnyxConfig = [
  {
    key: 'apiKey',
    type: 'string',
  },
  {
    key: 'from',
    type: 'string',
  },
  {
    key: 'messageProfileId',
    type: 'string',
  },
];

export const twilioConfig = [
  {
    key: 'accountSid',
    type: 'string',
  },
  {
    key: 'authToken',
    type: 'string',
  },
  {
    key: 'from',
    type: 'string',
  },
];
