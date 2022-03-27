import { ChannelTypeEnum } from '../../entities/message-template';
import { CredentialsKeyEnum } from './provider.enum';

export interface IProviderConfig {
  id: string;
  displayName: string;
  channel: ChannelTypeEnum;
  credentials: IConfigCredentials[];
  docReference: string;
  comingSoon?: boolean;
}

export interface IConfigCredentials {
  key: CredentialsKeyEnum;
  value?: string;
  displayName: string;
  type: string;
}

const mailConfigBase: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.From,
    displayName: 'From sender',
    type: 'string',
  },
  {
    key: CredentialsKeyEnum.SenderName,
    displayName: 'Sender name',
    type: 'string',
  },
];

const smsConfigBase: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.From,
    displayName: 'From',
    type: 'string',
  },
];

export const mailJsConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    type: 'string',
  },
  {
    key: CredentialsKeyEnum.SecretKey,
    displayName: 'Secret key',
    type: 'string',
  },
].concat(mailConfigBase);

export const mailgunConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    type: 'string',
  },
  {
    key: CredentialsKeyEnum.User,
    displayName: 'User name',
    type: 'string',
  },
  {
    key: CredentialsKeyEnum.Domain,
    displayName: 'Domain',
    type: 'string',
  },
].concat(mailConfigBase);

export const mailjetConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    type: 'string',
  },
  {
    key: CredentialsKeyEnum.SecretKey,
    displayName: 'API Secret',
    type: 'string',
  },
].concat(mailConfigBase);

export const nexmoConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    type: 'string',
  },
  {
    key: CredentialsKeyEnum.SecretKey,
    displayName: 'API secret',
    type: 'string',
  },
].concat(smsConfigBase);

export const mandrillConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    type: 'string',
  },
].concat(mailConfigBase);

export const nodemailerConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.User,
    displayName: 'User',
    type: 'string',
  },
  {
    key: CredentialsKeyEnum.Password,
    displayName: 'Password',
    type: 'string',
  },
  {
    key: CredentialsKeyEnum.Host,
    displayName: 'Host',
    type: 'string',
  },
  {
    key: CredentialsKeyEnum.Port,
    displayName: 'Port',
    type: 'number',
  },
  {
    key: CredentialsKeyEnum.Secure,
    displayName: 'Secure',
    type: 'boolean',
  },
].concat(mailConfigBase);

export const postmarkConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    type: 'string',
  },
].concat(mailConfigBase);

export const sendgridConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    type: 'string',
  },
].concat(mailConfigBase);

export const sendinblueConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    type: 'string',
  },
].concat(mailConfigBase);

export const sesConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'Access key ID',
    type: 'string',
  },
  {
    key: CredentialsKeyEnum.SecretKey,
    displayName: 'Secret access key',
    type: 'string',
  },
  {
    key: CredentialsKeyEnum.Region,
    displayName: 'Region',
    type: 'string',
  },
].concat(mailConfigBase);

export const plivoConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.AccountSid,
    displayName: 'Account SID',
    type: 'string',
  },
  {
    key: CredentialsKeyEnum.Token,
    displayName: 'Auth token',
    type: 'string',
  },
].concat(smsConfigBase);

export const sms77Config: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    type: 'string',
  },
].concat(smsConfigBase);

export const snsConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'Access key ID',
    type: 'string',
  },
  {
    key: CredentialsKeyEnum.SecretKey,
    displayName: 'Secret access key',
    type: 'string',
  },
];

export const telnyxConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    type: 'string',
  },
  {
    key: CredentialsKeyEnum.MessageProfileId,
    displayName: 'Message profile ID',
    type: 'string',
  },
].concat(smsConfigBase);

export const twilioConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.AccountSid,
    displayName: 'Account SID',
    type: 'string',
  },
  {
    key: CredentialsKeyEnum.Token,
    displayName: 'Auth token',
    type: 'string',
  },
].concat(smsConfigBase);
