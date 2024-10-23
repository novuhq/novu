import { CredentialsKeyEnum } from '../../../types';
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
    displayName: 'Region',
    description: 'Use EU if your account is registered to SparkPost EU',
    type: 'dropdown',
    required: false,
    value: null,
    dropdown: [
      { name: 'Default', value: null },
      { name: 'EU', value: 'eu' },
    ],
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

export const bulkSmsConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.ApiToken,
    displayName: 'API Token',
    type: 'string',
    required: true,
  },
];

export const iSendSmsConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.ApiToken,
    displayName: 'API Token',
    type: 'string',
    required: true,
  },
  {
    key: CredentialsKeyEnum.From,
    displayName: 'Default Sender ID',
    type: 'string',
    required: false,
  },
  {
    key: CredentialsKeyEnum.ContentType,
    displayName: 'Content Type',
    type: 'dropdown',
    required: false,
    value: null,
    dropdown: [
      { name: 'Default', value: null },
      { name: 'Unicode', value: 'unicode' },
      { name: 'Plain', value: 'plain' },
    ],
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

export const messagebirdConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.AccessKey,
    displayName: 'Access key',
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

export const grafanaOnCallConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.alertUid,
    displayName: 'Alert UID',
    type: 'string',
    description: 'a unique alert ID for grouping, maps to alert_uid of grafana webhook body content',
    required: false,
  },
  {
    key: CredentialsKeyEnum.title,
    displayName: 'Title.',
    type: 'string',
    description: 'title for the alert',
    required: false,
  },
  {
    key: CredentialsKeyEnum.imageUrl,
    displayName: 'Image URL',
    type: 'string',
    description: 'a URL for an image attached to alert, maps to image_url of grafana webhook body content',
    required: false,
  },
  {
    key: CredentialsKeyEnum.state,
    displayName: 'Alert State',
    type: 'string',
    description: 'either "ok" or "alerting". Helpful for auto-resolving',
    required: false,
  },
  {
    key: CredentialsKeyEnum.externalLink,
    displayName: 'External Link',
    type: 'string',
    description:
      'link back to your monitoring system, maps to "link_to_upstream_details" of grafana webhook body content',
    required: false,
  },
];

export const getstreamConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    type: 'string',
    required: true,
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

export const pushpadConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'Auth Token',
    type: 'text',
    required: true,
  },
  {
    key: CredentialsKeyEnum.ApplicationId,
    displayName: 'Project ID',
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
    required: false,
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

export const brazeEmailConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    type: 'string',
    required: true,
  },
  {
    key: CredentialsKeyEnum.ApiURL,
    displayName: 'Base URL',
    type: 'string',
    required: true,
  },
  {
    key: CredentialsKeyEnum.AppID,
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

export const simpleTextingConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    type: 'text',
    required: true,
  },
  ...smsConfigBase,
];

export const bandwidthConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.User,
    displayName: 'Username',
    description: 'Your Bandwidth account username',
    type: 'text',
    required: true,
  },
  {
    key: CredentialsKeyEnum.Password,
    displayName: 'Password',
    type: 'password',
    required: true,
  },
  {
    key: CredentialsKeyEnum.AccountSid,
    displayName: 'Account ID',
    type: 'text',
    required: true,
  },
  ...smsConfigBase,
];

export const genericSmsConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.BaseUrl,
    displayName: 'Base URL',
    type: 'string',
    required: true,
  },
  {
    key: CredentialsKeyEnum.ApiKeyRequestHeader,
    displayName: 'API Key Request Header',
    type: 'string',
    description: 'The name of the header attribute to use for the API key ex. (X-API-KEY, apiKey, ...)',
    required: true,
  },
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    type: 'string',
    description: 'The value of the header attribute to use for the API key.',
    required: true,
  },
  {
    key: CredentialsKeyEnum.SecretKeyRequestHeader,
    displayName: 'Secret Key Request Header',
    type: 'string',
    description: 'The name of the header attribute to use for the secret key ex. (X-SECRET-KEY, secretKey, ...)',
    required: false,
  },
  {
    key: CredentialsKeyEnum.SecretKey,
    displayName: 'Secret Key',
    type: 'string',
    description: 'The value of the header attribute to use for the secret key',
    required: false,
  },
  {
    key: CredentialsKeyEnum.IdPath,
    displayName: 'Id Path',
    type: 'string',
    value: 'data.id',
    description: 'The path to the id field in the response data ex. (id, message.id, ...)',
    required: true,
  },
  {
    key: CredentialsKeyEnum.DatePath,
    displayName: 'Date Path',
    type: 'string',
    value: 'data.date',
    description: 'The path to the date field in the response data ex. (date, message.date, ...)',
    required: false,
  },
  {
    key: CredentialsKeyEnum.AuthenticateByToken,
    displayName: 'Authenticate by token',
    type: 'switch',
    description: 'If enabled, the API key and secret key will be sent as a token in the Authorization header',
    required: false,
  },
  {
    key: CredentialsKeyEnum.Domain,
    displayName: 'Auth URL',
    type: 'string',
    description: 'The URL to use for authentication in case the Authenticate by token option is enabled',
    required: false,
    tooltip: {
      text: 'The URL to use for authentication in case the Authenticate by token option is enabled',
      when: true,
    },
  },
  {
    key: CredentialsKeyEnum.AuthenticationTokenKey,
    displayName: 'Authentication Token Key',
    type: 'string',
    description:
      'The name of the header attribute to use for the authentication token ex. (X-AUTH-TOKEN, auth-token, ...)',
    required: false,
  },
  ...smsConfigBase,
];

export const pusherBeamsConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.InstanceId,
    displayName: 'Instance ID',
    description: 'The unique identifier for your Beams instance',
    type: 'string',
    required: true,
  },
  {
    key: CredentialsKeyEnum.SecretKey,
    displayName: 'Secret Key',
    description: 'The secret key your server will use to access your Beams instance',
    type: 'string',
    required: true,
  },
  ...pushConfigBase,
];

export const azureSmsConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.AccessKey,
    displayName: 'Connection string',
    description: 'Your Azure account connection string',
    type: 'text',
    required: true,
  },
  ...smsConfigBase,
];

export const rocketChatConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.Token,
    displayName: 'Personal Access Token (x-auth-token)',
    description: 'Personal Access Token of your user',
    type: 'text',
    required: true,
  },
  {
    key: CredentialsKeyEnum.User,
    displayName: 'User id (x-user-id)',
    description: 'Your User id',
    type: 'text',
    required: true,
  },
];

export const ringCentralConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.ClientId,
    displayName: 'Client ID',
    description: 'Your RingCentral app client ID',
    type: 'string',
    required: true,
  },
  {
    key: CredentialsKeyEnum.SecretKey,
    displayName: 'Client secret',
    description: 'Your RingCentral app client secret',
    type: 'string',
    required: true,
  },
  {
    key: CredentialsKeyEnum.Secure,
    displayName: 'Is sandbox',
    type: 'switch',
    required: false,
  },
  {
    key: CredentialsKeyEnum.Token,
    displayName: 'JWT token',
    description: 'Your RingCentral user JWT token',
    type: 'string',
    required: true,
  },
  ...smsConfigBase,
];

export const brevoSmsConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    type: 'string',
    required: true,
  },
  ...smsConfigBase,
];

export const eazySmsConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    type: 'string',
    required: true,
  },
  {
    key: CredentialsKeyEnum.channelId,
    displayName: 'SMS Channel Id',
    type: 'string',
    required: true,
    description: 'Your SMS Channel Id',
  },
];

export const whatsAppBusinessConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.ApiToken,
    displayName: 'Access API token',
    description: 'Your WhatsApp Business access API token',
    type: 'string',
    required: true,
  },
  {
    key: CredentialsKeyEnum.phoneNumberIdentification,
    displayName: 'Phone Number Identification',
    description: 'Your WhatsApp Business phone number identification',
    type: 'string',
    required: true,
  },
];

export const mobishastraConfig: IConfigCredentials[] = [
  {
    key: CredentialsKeyEnum.BaseUrl,
    displayName: 'Base URL',
    type: 'string',
    required: true,
  },
  {
    key: CredentialsKeyEnum.User,
    displayName: 'Username',
    type: 'string',
    description: 'Username provided by Mobishatra',
    required: true,
  },
  {
    key: CredentialsKeyEnum.Password,
    displayName: 'Password',
    type: 'string',
    description: ' provided by Mobishastra',
    required: true,
  },
  ...smsConfigBase,
];
