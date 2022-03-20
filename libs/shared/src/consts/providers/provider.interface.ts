import { ChannelTypeEnum } from '../../entities/message-template';

export interface IProviderConfig {
  id: string;
  displayName: string;
  channel: ChannelTypeEnum;
  credentials: IConfigCredentials[];
  docReference: string;
  comingSoon?: boolean;
}

export interface IConfigCredentials {
  key: string;
  value: string;
  type: string;
}

export const mailJsConfig: IConfigCredentials[] = [
  {
    key: 'apiKey',
    value: 'API Key',
    type: 'string',
  },
  {
    key: 'secretKey',
    value: 'Secret key',
    type: 'string',
  },
];

export const mailgunConfig: IConfigCredentials[] = [
  {
    key: 'apiKey',
    value: 'API Key',
    type: 'string',
  },
  {
    key: 'username',
    value: 'User name',
    type: 'string',
  },
  {
    key: 'domain',
    value: 'Domain',
    type: 'string',
  },
  {
    key: 'from',
    value: 'From',
    type: 'string',
  },
];

export const mailjetConfig: IConfigCredentials[] = [
  {
    key: 'apiKey',
    value: 'API Key',
    type: 'string',
  },
  {
    key: 'apiSecret',
    value: 'API Secret',
    type: 'string',
  },
  {
    key: 'from',
    value: 'From',
    type: 'string',
  },
];

export const nexmoConfig: IConfigCredentials[] = [
  {
    key: 'apiKey',
    value: 'API Key',
    type: 'string',
  },
  {
    key: 'apiSecret',
    value: 'API secret',
    type: 'string',
  },
  {
    key: 'from',
    value: 'From',
    type: 'string',
  },
];

export const mandrillConfig: IConfigCredentials[] = [
  {
    key: 'apiKey',
    value: 'API Key',
    type: 'string',
  },
  {
    key: 'from',
    value: 'From',
    type: 'string',
  },
];

export const nodemailerConfig: IConfigCredentials[] = [
  {
    key: 'user',
    value: 'User',
    type: 'string',
  },
  {
    key: 'password',
    value: 'Password',
    type: 'string',
  },
  {
    key: 'host',
    value: 'Host',
    type: 'string',
  },
  {
    key: 'port',
    value: 'Port',
    type: 'number',
  },
  {
    key: 'secure',
    value: 'Secure',
    type: 'boolean',
  },
  {
    key: 'from',
    value: 'From',
    type: 'string',
  },
];

export const postmarkConfig: IConfigCredentials[] = [
  {
    key: 'apiKey',
    value: 'API Key',
    type: 'string',
  },
  {
    key: 'from',
    value: 'From',
    type: 'string',
  },
];

export const sendgridConfig: IConfigCredentials[] = [
  {
    key: 'apiKey',
    value: 'API Key',
    type: 'string',
  },
  {
    key: 'from',
    value: 'From',
    type: 'string',
  },
];

export const sendinblueConfig: IConfigCredentials[] = [
  {
    key: 'apiKey',
    value: 'API Key',
    type: 'string',
  },
];

export const sesConfig: IConfigCredentials[] = [
  {
    key: 'accessKeyId',
    value: 'Access key ID',
    type: 'string',
  },
  {
    key: 'secretAccessKey',
    value: 'Secret access key',
    type: 'string',
  },
  {
    key: 'region',
    value: 'Region',
    type: 'string',
  },
  {
    key: 'from',
    value: 'From',
    type: 'string',
  },
];

export const plivoConfig: IConfigCredentials[] = [
  {
    key: 'accountSid',
    value: 'Account SID',
    type: 'string',
  },
  {
    key: 'authToken',
    value: 'Auth token',
    type: 'string',
  },
  {
    key: 'from',
    value: 'From',
    type: 'string',
  },
];

export const sms77Config: IConfigCredentials[] = [
  {
    key: 'apiKey',
    value: 'API Key',
    type: 'string',
  },
  {
    key: 'from',
    value: 'From',
    type: 'string',
  },
];

export const snsConfig: IConfigCredentials[] = [
  {
    key: 'accessKeyId',
    value: 'Access key ID',
    type: 'string',
  },
  {
    key: 'secretAccessKey',
    value: 'Secret access key',
    type: 'string',
  },
];

export const telnyxConfig: IConfigCredentials[] = [
  {
    key: 'apiKey',
    value: 'API Key',
    type: 'string',
  },
  {
    key: 'messageProfileId',
    value: 'Message profile ID',
    type: 'string',
  },
  {
    key: 'from',
    value: 'From',
    type: 'string',
  },
];

export const twilioConfig: IConfigCredentials[] = [
  {
    key: 'accountSid',
    value: 'Account SID',
    type: 'string',
  },
  {
    key: 'authToken',
    value: 'Auth token',
    type: 'string',
  },
  {
    key: 'from',
    value: 'From',
    type: 'string',
  },
];
