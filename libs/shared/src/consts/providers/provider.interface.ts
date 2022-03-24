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
  value?: string;
  displayName: string;
  type: string;
}

export const mailJsConfig: IConfigCredentials[] = [
  {
    key: 'apiKey',
    displayName: 'API Key',
    type: 'string',
  },
  {
    key: 'secretKey',
    displayName: 'Secret key',
    type: 'string',
  },
  {
    key: 'fromSender',
    displayName: 'From sender',
    type: 'string',
  },
  {
    key: 'senderName',
    displayName: 'Sender name',
    type: 'string',
  },
];

export const mailgunConfig: IConfigCredentials[] = [
  {
    key: 'apiKey',
    displayName: 'API Key',
    type: 'string',
  },
  {
    key: 'username',
    displayName: 'User name',
    type: 'string',
  },
  {
    key: 'domain',
    displayName: 'Domain',
    type: 'string',
  },
  {
    key: 'from',
    displayName: 'From',
    type: 'string',
  },
  {
    key: 'fromSender',
    displayName: 'From sender',
    type: 'string',
  },
  {
    key: 'senderName',
    displayName: 'Sender name',
    type: 'string',
  },
];

export const mailjetConfig: IConfigCredentials[] = [
  {
    key: 'apiKey',
    displayName: 'API Key',
    type: 'string',
  },
  {
    key: 'apiSecret',
    displayName: 'API Secret',
    type: 'string',
  },
  {
    key: 'from',
    displayName: 'From',
    type: 'string',
  },
  {
    key: 'fromSender',
    displayName: 'From sender',
    type: 'string',
  },
  {
    key: 'senderName',
    displayName: 'Sender name',
    type: 'string',
  },
];

export const nexmoConfig: IConfigCredentials[] = [
  {
    key: 'apiKey',
    displayName: 'API Key',
    type: 'string',
  },
  {
    key: 'secretKey',
    displayName: 'API secret',
    type: 'string',
  },
  {
    key: 'from',
    displayName: 'From',
    type: 'string',
  },
];

export const mandrillConfig: IConfigCredentials[] = [
  {
    key: 'apiKey',
    displayName: 'API Key',
    type: 'string',
  },
  {
    key: 'from',
    displayName: 'From',
    type: 'string',
  },
  {
    key: 'fromSender',
    displayName: 'From sender',
    type: 'string',
  },
  {
    key: 'senderName',
    displayName: 'Sender name',
    type: 'string',
  },
];

export const nodemailerConfig: IConfigCredentials[] = [
  {
    key: 'user',
    displayName: 'User',
    type: 'string',
  },
  {
    key: 'password',
    displayName: 'Password',
    type: 'string',
  },
  {
    key: 'host',
    displayName: 'Host',
    type: 'string',
  },
  {
    key: 'port',
    displayName: 'Port',
    type: 'number',
  },
  {
    key: 'secure',
    displayName: 'Secure',
    type: 'boolean',
  },
  {
    key: 'from',
    displayName: 'From',
    type: 'string',
  },
  {
    key: 'fromSender',
    displayName: 'From sender',
    type: 'string',
  },
  {
    key: 'senderName',
    displayName: 'Sender name',
    type: 'string',
  },
];

export const postmarkConfig: IConfigCredentials[] = [
  {
    key: 'apiKey',
    displayName: 'API Key',
    type: 'string',
  },
  {
    key: 'from',
    displayName: 'From',
    type: 'string',
  },
  {
    key: 'fromSender',
    displayName: 'From sender',
    type: 'string',
  },
  {
    key: 'senderName',
    displayName: 'Sender name',
    type: 'string',
  },
];

export const sendgridConfig: IConfigCredentials[] = [
  {
    key: 'apiKey',
    displayName: 'API Key',
    type: 'string',
  },
  {
    key: 'from',
    displayName: 'From',
    type: 'string',
  },
  {
    key: 'fromSender',
    displayName: 'From sender',
    type: 'string',
  },
  {
    key: 'senderName',
    displayName: 'Sender name',
    type: 'string',
  },
];

export const sendinblueConfig: IConfigCredentials[] = [
  {
    key: 'apiKey',
    displayName: 'API Key',
    type: 'string',
  },
  {
    key: 'fromSender',
    displayName: 'From sender',
    type: 'string',
  },
  {
    key: 'senderName',
    displayName: 'Sender name',
    type: 'string',
  },
];

export const sesConfig: IConfigCredentials[] = [
  {
    key: 'accessKeyId',
    displayName: 'Access key ID',
    type: 'string',
  },
  {
    key: 'secretAccessKey',
    displayName: 'Secret access key',
    type: 'string',
  },
  {
    key: 'region',
    displayName: 'Region',
    type: 'string',
  },
  {
    key: 'from',
    displayName: 'From',
    type: 'string',
  },
  {
    key: 'fromSender',
    displayName: 'From sender',
    type: 'string',
  },
  {
    key: 'senderName',
    displayName: 'Sender name',
    type: 'string',
  },
];

export const plivoConfig: IConfigCredentials[] = [
  {
    key: 'accountSid',
    displayName: 'Account SID',
    type: 'string',
  },
  {
    key: 'token',
    displayName: 'Auth token',
    type: 'string',
  },
  {
    key: 'from',
    displayName: 'From',
    type: 'string',
  },
];

export const sms77Config: IConfigCredentials[] = [
  {
    key: 'apiKey',
    displayName: 'API Key',
    type: 'string',
  },
  {
    key: 'from',
    displayName: 'From',
    type: 'string',
  },
];

export const snsConfig: IConfigCredentials[] = [
  {
    key: 'accessKeyId',
    displayName: 'Access key ID',
    type: 'string',
  },
  {
    key: 'secretAccessKey',
    displayName: 'Secret access key',
    type: 'string',
  },
];

export const telnyxConfig: IConfigCredentials[] = [
  {
    key: 'apiKey',
    displayName: 'API Key',
    type: 'string',
  },
  {
    key: 'messageProfileId',
    displayName: 'Message profile ID',
    type: 'string',
  },
  {
    key: 'from',
    displayName: 'From',
    type: 'string',
  },
];

export const twilioConfig: IConfigCredentials[] = [
  {
    key: 'accountSid',
    displayName: 'Account SID',
    type: 'string',
  },
  {
    key: 'token',
    displayName: 'Auth token',
    type: 'string',
  },
  {
    key: 'from',
    displayName: 'From',
    type: 'string',
  },
];
