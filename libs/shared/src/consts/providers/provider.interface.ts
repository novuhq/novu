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

const mailConfigBase: IConfigCredentials[] = [
  {
    key: 'from',
    displayName: 'From sender',
    type: 'string',
  },
  {
    key: 'senderName',
    displayName: 'Sender name',
    type: 'string',
  },
];

const smsConfigBase: IConfigCredentials[] = [
  {
    key: 'from',
    displayName: 'From',
    type: 'string',
  },
];

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
].concat(mailConfigBase);

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
].concat(mailConfigBase);

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
].concat(mailConfigBase);

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
].concat(smsConfigBase);

export const mandrillConfig: IConfigCredentials[] = [
  {
    key: 'apiKey',
    displayName: 'API Key',
    type: 'string',
  },
].concat(mailConfigBase);

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
].concat(mailConfigBase);

export const postmarkConfig: IConfigCredentials[] = [
  {
    key: 'apiKey',
    displayName: 'API Key',
    type: 'string',
  },
].concat(mailConfigBase);

export const sendgridConfig: IConfigCredentials[] = [
  {
    key: 'apiKey',
    displayName: 'API Key',
    type: 'string',
  },
].concat(mailConfigBase);

export const sendinblueConfig: IConfigCredentials[] = [
  {
    key: 'apiKey',
    displayName: 'API Key',
    type: 'string',
  },
].concat(mailConfigBase);

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
].concat(mailConfigBase);

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
].concat(smsConfigBase);

export const sms77Config: IConfigCredentials[] = [
  {
    key: 'apiKey',
    displayName: 'API Key',
    type: 'string',
  },
].concat(smsConfigBase);

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
].concat(smsConfigBase);

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
].concat(smsConfigBase);
