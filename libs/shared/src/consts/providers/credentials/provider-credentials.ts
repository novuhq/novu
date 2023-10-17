import { CredentialsKeyEnum } from '../provider.enum';
import { IConfigCredentials } from '../provider.interface';

const mailConfigBase: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.From,
    displayName: 'From email address',
    description: 'Use the same email address you used to authenticate your delivery provider',
    type: 'string',
    required: true,
  },
  {
    key: CredentialsKeyEnum.SenderName,
    displayName: 'Sender name',
    type: 'string',
    required: true,
  },
];

const smsConfigBase: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.From,
    displayName: 'From',
    type: 'string',
    required: true,
  },
];

const pushConfigBase: IConfigCredentials[] = [];

export const mailJsConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    type: 'string',
    required: true,
  },
  {
    key: CredentialsKeyEnum.SecretKey,
    displayName: 'Secret key',
    type: 'string',
    required: true,
  },
  ...mailConfigBase,
];

export const mailgunConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    type: 'string',
    required: true,
  },
  {
    key: CredentialsKeyEnum.BaseUrl,
    displayName: 'Base URL',
    type: 'string',
    required: false,
  },
  {
    key: CredentialsKeyEnum.User,
    displayName: 'User name',
    type: 'string',
    required: true,
  },
  {
    key: CredentialsKeyEnum.Domain,
    displayName: 'Domain',
    type: 'string',
    required: true,
  },
  ...mailConfigBase,
];

export const mailjetConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    type: 'string',
    required: true,
  },
  {
    key: CredentialsKeyEnum.SecretKey,
    displayName: 'API Secret',
    type: 'string',
    required: true,
  },
  ...mailConfigBase,
];

export const nexmoConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    type: 'string',
    required: true,
  },
  {
    key: CredentialsKeyEnum.SecretKey,
    displayName: 'API secret',
    type: 'string',
    required: true,
  },
  ...smsConfigBase,
];

export const mandrillConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    type: 'string',
    required: true,
  },
  ...mailConfigBase,
];

export const nodemailerConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.User,
    displayName: 'User',
    type: 'string',
    required: false,
  },
  {
    key: CredentialsKeyEnum.Password,
    displayName: 'Password',
    type: 'string',
    required: false,
  },
  {
    key: CredentialsKeyEnum.Host,
    displayName: 'Host',
    type: 'string',
    required: true,
  },
  {
    key: CredentialsKeyEnum.Port,
    displayName: 'Port',
    type: 'number',
    required: true,
  },
  {
    key: CredentialsKeyEnum.Secure,
    displayName: 'Secure',
    type: 'boolean',
    required: false,
  },
  {
    key: CredentialsKeyEnum.RequireTls,
    displayName: 'Require TLS',
    type: 'switch',
    required: false,
  },
  {
    key: CredentialsKeyEnum.IgnoreTls,
    displayName: 'Ignore TLS',
    type: 'switch',
    required: false,
  },
  {
    key: CredentialsKeyEnum.TlsOptions,
    displayName: 'TLS options',
    type: 'object',
    required: false,
  },
  {
    key: CredentialsKeyEnum.Domain,
    displayName: 'DKIM: Domain name',
    type: 'string',
    required: false,
  },
  {
    key: CredentialsKeyEnum.SecretKey,
    displayName: 'DKIM: Private key',
    type: 'string',
    required: false,
  },
  {
    key: CredentialsKeyEnum.AccountSid,
    displayName: 'DKIM: Key selector',
    type: 'string',
    required: false,
  },
  ...mailConfigBase,
];

export const postmarkConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    type: 'string',
    required: true,
  },
  ...mailConfigBase,
];

export const sendgridConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    type: 'string',
    required: true,
  },
  {
    key: CredentialsKeyEnum.IpPoolName,
    displayName: 'IP Pool Name',
    type: 'string',
    required: false,
  },
  ...mailConfigBase,
];

export const resendConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    type: 'string',
    required: true,
  },
  ...mailConfigBase,
];

export const mailtrapConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    type: 'string',
    required: true,
  },
  ...mailConfigBase,
];

export const plunkConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    type: 'string',
    required: true,
  },
  ...mailConfigBase,
];

export const sparkpostConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    type: 'string',
    required: true,
  },
  {
    key: CredentialsKeyEnum.Region,
    displayName: 'EU',
    description: 'Use `eu` if your account is registered to SparkPost EU',
    type: 'boolean',
    required: false,
  },
  ...mailConfigBase,
];

export const netCoreConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    type: 'string',
    required: true,
  },
  ...mailConfigBase,
];

export const sendinblueConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    type: 'string',
    required: true,
  },
  ...mailConfigBase,
];

export const sesConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'Access key ID',
    type: 'string',
    required: true,
  },
  {
    key: CredentialsKeyEnum.SecretKey,
    displayName: 'Secret access key',
    type: 'string',
    required: true,
  },
  {
    key: CredentialsKeyEnum.Region,
    displayName: 'Region',
    type: 'string',
    required: true,
  },
  ...mailConfigBase,
];

export const mailerSendConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    type: 'string',
    required: true,
  },
  ...mailConfigBase,
];

export const plivoConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.AccountSid,
    displayName: 'Account SID',
    type: 'string',
    required: true,
  },
  {
    key: CredentialsKeyEnum.Token,
    displayName: 'Auth token',
    type: 'string',
    required: true,
  },
  ...smsConfigBase,
];

export const sms77Config: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    type: 'string',
    required: true,
  },
  ...smsConfigBase,
];

export const termiiConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    type: 'string',
    required: true,
  },
  ...smsConfigBase,
];

export const burstSmsConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    type: 'string',
    required: true,
  },
  {
    key: CredentialsKeyEnum.SecretKey,
    displayName: 'API Secret',
    type: 'string',
    required: true,
  },
];

export const clickatellConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    type: 'string',
    required: true,
  },
];

export const snsConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'Access key ID',
    type: 'string',
    required: true,
  },
  {
    key: CredentialsKeyEnum.SecretKey,
    displayName: 'Secret access key',
    type: 'string',
    required: true,
  },
  {
    key: CredentialsKeyEnum.Region,
    displayName: 'AWS region',
    type: 'string',
    required: true,
  },
];

export const telnyxConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    type: 'string',
    required: true,
  },
  {
    key: CredentialsKeyEnum.MessageProfileId,
    displayName: 'Message profile ID',
    type: 'string',
    required: true,
  },
  ...smsConfigBase,
];

export const twilioConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.AccountSid,
    displayName: 'Account SID',
    type: 'string',
    required: true,
  },
  {
    key: CredentialsKeyEnum.Token,
    displayName: 'Auth token',
    type: 'string',
    required: true,
  },
  ...smsConfigBase,
];

export const slackConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.ApplicationId,
    displayName: 'Application Id',
    type: 'string',
    required: true,
  },
  {
    key: CredentialsKeyEnum.ClientId,
    displayName: 'Client ID',
    type: 'string',
    required: true,
  },
  {
    key: CredentialsKeyEnum.SecretKey,
    displayName: 'Client Secret',
    type: 'string',
    required: true,
  },
  {
    key: CredentialsKeyEnum.RedirectUrl,
    displayName: 'Redirect URL',
    description: 'Redirect after Slack OAuth flow finished (default behaviour will close the tab)',
    type: 'string',
    required: false,
  },
  {
    key: CredentialsKeyEnum.Hmac,
    displayName: 'HMAC',
    type: 'switch',
    required: false,
  },
];

export const fcmConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.ServiceAccount,
    displayName: 'Service Account (entire JSON file)',
    type: 'text',
    required: true,
  },
  ...pushConfigBase,
];

export const expoConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'Access Token',
    type: 'text',
    required: true,
  },
  ...pushConfigBase,
];

export const pushWebhookConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.WebhookUrl,
    displayName: 'Webhook URL',
    type: 'string',
    description: 'the webhook URL to call to trigger push notifications',
    required: true,
  },
  {
    key: CredentialsKeyEnum.SecretKey,
    displayName: 'Secret Hmac Key',
    type: 'string',
    description: 'the secret used to sign webhooks calls',
    required: true,
  },
  ...pushConfigBase,
];

export const oneSignalConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.ApplicationId,
    displayName: 'Application ID',
    type: 'text',
    required: true,
  },
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    type: 'text',
    required: true,
  },
  ...pushConfigBase,
];

export const apnsConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.SecretKey,
    displayName: 'Private Key',
    type: 'text',
    required: true,
  },
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'Key ID',
    type: 'string',
    required: true,
  },
  {
    key: CredentialsKeyEnum.ProjectName,
    displayName: 'Team ID',
    type: 'string',
    required: true,
  },
  {
    key: CredentialsKeyEnum.ApplicationId,
    displayName: 'Bundle ID',
    type: 'string',
    required: true,
  },
  {
    key: CredentialsKeyEnum.Secure,
    displayName: 'Production',
    type: 'switch',
    required: true,
  },

  ...pushConfigBase,
];

export const gupshupConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.User,
    displayName: 'User id',
    type: 'string',
    required: true,
  },
  {
    key: CredentialsKeyEnum.Password,
    displayName: 'Password',
    type: 'string',
    required: true,
  },
];

export const firetextConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    type: 'string',
    required: true,
  },
  ...smsConfigBase,
];

export const outlook365Config: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.Password,
    displayName: 'Password',
    type: 'string',
    required: true,
  },
  ...mailConfigBase,
];

export const infobipSMSConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    type: 'string',
    required: true,
  },
  {
    key: CredentialsKeyEnum.BaseUrl,
    displayName: 'Base URL',
    type: 'string',
    required: true,
  },
  ...smsConfigBase,
];

export const infobipEmailConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    type: 'string',
    required: true,
  },
  {
    key: CredentialsKeyEnum.BaseUrl,
    displayName: 'Base URL',
    type: 'string',
    required: true,
  },
  ...mailConfigBase,
];

export const fortySixElksConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.User,
    displayName: 'Username',
    type: 'string',
    required: true,
  },
  {
    key: CredentialsKeyEnum.Password,
    displayName: 'Password',
    type: 'string',
    required: true,
  },
  ...smsConfigBase,
];

export const kannelConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.Host,
    displayName: 'Host',
    type: 'string',
    required: true,
  },
  {
    key: CredentialsKeyEnum.Port,
    displayName: 'Port',
    type: 'number',
    required: true,
  },
  {
    key: CredentialsKeyEnum.User,
    displayName: 'Username',
    type: 'string',
    required: false,
  },
  {
    key: CredentialsKeyEnum.Password,
    displayName: 'Password',
    type: 'string',
    required: false,
  },
  ...smsConfigBase,
];

export const maqsamConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'Access Key ID',
    type: 'string',
    required: true,
  },
  {
    key: CredentialsKeyEnum.SecretKey,
    displayName: 'Access Secret',
    type: 'string',
    required: true,
  },
  ...smsConfigBase,
];

export const smsCentralConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.User,
    displayName: 'Username',
    type: 'string',
    required: true,
  },
  {
    key: CredentialsKeyEnum.Password,
    displayName: 'Password',
    type: 'string',
    required: true,
  },
  {
    key: CredentialsKeyEnum.BaseUrl,
    displayName: 'Base URL',
    type: 'string',
    required: false,
  },
  ...smsConfigBase,
];

export const emailWebhookConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.WebhookUrl,
    displayName: 'Webhook URL',
    type: 'string',
    description: 'the webhook URL to call instead of sending the email',
    required: true,
  },
  {
    key: CredentialsKeyEnum.SecretKey,
    displayName: 'Secret Hmac Key',
    type: 'string',
    description: 'the secret used to sign webhooks calls',
    required: true,
  },
  ...mailConfigBase,
];

export const africasTalkingConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    type: 'string',
    required: true,
  },
  {
    key: CredentialsKeyEnum.User,
    displayName: 'Username',
    type: 'string',
    required: true,
  },
  ...smsConfigBase,
];

export const novuInAppConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.Hmac,
    displayName: 'Security HMAC encryption',
    type: 'switch',
    required: false,
    tooltip: {
      text: 'When active it verifies if a request is performed by a specific user',
      when: false,
    },
  },
];

export const sendchampConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    type: 'string',
    required: true,
  },
  ...smsConfigBase,
];

export const clickSendConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.User,
    displayName: 'Username',
    description: 'Your Clicksend API username',
    type: 'text',
    required: true,
  },
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    type: 'text',
    required: true,
  },
  ...smsConfigBase,
];
