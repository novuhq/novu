import { CredentialsKeyEnum } from '../../../types';
import { IConfigCredential } from '../provider.interface';

const mailConfigBase: IConfigCredential[] = [
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

const smsConfigBase: IConfigCredential[] = [
  {
    key: CredentialsKeyEnum.From,
    displayName: 'From',
    type: 'string',
    required: true,
  },
];

const pushConfigBase: IConfigCredential[] = [];

export const mailJsConfig: IConfigCredential[] = [
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

export const mailgunConfig: IConfigCredential[] = [
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

export const mailjetConfig: IConfigCredential[] = [
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

export const nexmoConfig: IConfigCredential[] = [
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

export const mandrillConfig: IConfigCredential[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    type: 'string',
    required: true,
  },
  ...mailConfigBase,
];

export const nodemailerConfig: IConfigCredential[] = [
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
    type: 'string',
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

export const postmarkConfig: IConfigCredential[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    type: 'string',
    required: true,
  },
  ...mailConfigBase,
];

export const sendgridConfig: IConfigCredential[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    type: 'string',
    required: true,
  },
  {
    key: CredentialsKeyEnum.Region,
    displayName: 'Region',
    description: 'Select EU if your SendGrid account is hosted in the EU data center',
    type: 'dropdown',
    required: false,
    value: 'global',
    dropdown: [
      { name: 'Global (US)', value: 'global' },
      { name: 'EU', value: 'eu' },
    ],
  },
  {
    key: CredentialsKeyEnum.IpPoolName,
    displayName: 'IP Pool Name',
    type: 'string',
    required: false,
  },
  ...mailConfigBase,
];

export const resendConfig: IConfigCredential[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    type: 'string',
    required: true,
  },
  ...mailConfigBase,
];

export const mailtrapConfig: IConfigCredential[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    type: 'string',
    required: true,
  },
  ...mailConfigBase,
];

export const plunkConfig: IConfigCredential[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    type: 'string',
    required: true,
  },
  ...mailConfigBase,
];

export const sparkpostConfig: IConfigCredential[] = [
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

export const netCoreConfig: IConfigCredential[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    type: 'string',
    required: true,
  },
  ...mailConfigBase,
];

export const sendinblueConfig: IConfigCredential[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    type: 'string',
    required: true,
  },
  ...mailConfigBase,
];

export const sesConfig: IConfigCredential[] = [
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

export const mailerSendConfig: IConfigCredential[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    type: 'string',
    required: true,
  },
  ...mailConfigBase,
];

export const plivoConfig: IConfigCredential[] = [
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

export const sms77Config: IConfigCredential[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    type: 'string',
    required: true,
  },
  ...smsConfigBase,
];

export const termiiConfig: IConfigCredential[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    type: 'string',
    required: true,
  },
  ...smsConfigBase,
];

export const burstSmsConfig: IConfigCredential[] = [
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

export const bulkSmsConfig: IConfigCredential[] = [
  {
    key: CredentialsKeyEnum.ApiToken,
    displayName: 'API Token',
    type: 'string',
    required: true,
  },
  {
    key: CredentialsKeyEnum.From,
    displayName: 'Sender ID',
    description:
      'Sender Id is used for from field in the request. If not provided, from field will not be sent in the request',
    type: 'string',
    required: false,
  },
];

export const iSendSmsConfig: IConfigCredential[] = [
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

export const clickatellConfig: IConfigCredential[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    type: 'string',
    required: true,
  },
];

export const snsConfig: IConfigCredential[] = [
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

export const telnyxConfig: IConfigCredential[] = [
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

export const twilioConfig: IConfigCredential[] = [
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

export const messagebirdConfig: IConfigCredential[] = [
  {
    key: CredentialsKeyEnum.AccessKey,
    displayName: 'Access key',
    type: 'string',
    required: true,
  },
  ...smsConfigBase,
];

export const slackConfigLegacy: IConfigCredential[] = [
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

export const slackConfig: IConfigCredential[] = [
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
];

export const msTeamsConfig: IConfigCredential[] = [
  {
    key: CredentialsKeyEnum.ClientId,
    displayName: 'Client ID',
    description: 'Azure Bot Application (client) ID',
    type: 'string',
    required: false,
  },
  {
    key: CredentialsKeyEnum.SecretKey,
    displayName: 'Client Secret',
    description: 'Azure Bot Client Secret value',
    type: 'string',
    required: false,
  },
  {
    key: CredentialsKeyEnum.TenantId,
    displayName: 'Tenant ID',
    description: 'Azure Bot Tenant ID',
    type: 'string',
    required: false,
  },
  {
    key: CredentialsKeyEnum.RedirectUrl,
    displayName: 'Redirect URL',
    description: 'Redirect after Teams OAuth flow finished (default behaviour will close the tab)',
    type: 'string',
    required: false,
  },
];

export const grafanaOnCallConfig: IConfigCredential[] = [
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

export const getstreamConfig: IConfigCredential[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    type: 'string',
    required: true,
  },
];

export const fcmConfig: IConfigCredential[] = [
  {
    key: CredentialsKeyEnum.ServiceAccount,
    displayName: 'Service Account (entire JSON file)',
    type: 'textarea',
    required: true,
    validation: {
      validate: (value: string) => {
        if (!value || value.trim() === '') {
          return true; // Let required validation handle empty values
        }

        try {
          JSON.parse(value);

          return true;
        } catch {
          return 'Invalid JSON format. Please provide a valid JSON service account file.';
        }
      },
    },
  },
  ...pushConfigBase,
];

export const expoConfig: IConfigCredential[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'Access Token',
    type: 'text',
    required: true,
  },
  ...pushConfigBase,
];

export const pushWebhookConfig: IConfigCredential[] = [
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

export const chatWebhookConfig: IConfigCredential[] = [
  {
    key: CredentialsKeyEnum.SecretKey,
    displayName: 'Secret Hmac Key',
    type: 'string',
    description: 'the secret used to sign webhooks calls',
    required: false,
  },
];

export const oneSignalConfig: IConfigCredential[] = [
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
  {
    key: CredentialsKeyEnum.ApiVersion,
    displayName: 'One Signal API',
    description: 'Select the One Signal API to use',
    type: 'dropdown',
    required: false,
    value: null,
    dropdown: [
      { name: 'Default (Player Model)', value: 'playerModel' },
      { name: 'External ID', value: 'externalId' },
    ],
  },
  ...pushConfigBase,
];

export const pushpadConfig: IConfigCredential[] = [
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

export const apnsConfig: IConfigCredential[] = [
  {
    key: CredentialsKeyEnum.SecretKey,
    displayName: 'Private Key',
    type: 'textarea',
    required: true,
    validation: {
      validate: (value: string) => {
        try {
          // Check if it's a valid PEM format
          if (!value.includes('-----BEGIN PRIVATE KEY-----') || !value.includes('-----END PRIVATE KEY-----')) {
            return 'Invalid private key format. Must be in PEM format.';
          }

          return true;
        } catch {
          return 'Invalid private key format. Must be in PEM format.';
        }
      },
    },
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

export const gupshupConfig: IConfigCredential[] = [
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

export const firetextConfig: IConfigCredential[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    type: 'string',
    required: true,
  },
  ...smsConfigBase,
];

export const outlook365Config: IConfigCredential[] = [
  {
    key: CredentialsKeyEnum.Password,
    displayName: 'Password',
    type: 'string',
    required: true,
  },
  ...mailConfigBase,
];

export const infobipSMSConfig: IConfigCredential[] = [
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

export const infobipEmailConfig: IConfigCredential[] = [
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

export const brazeEmailConfig: IConfigCredential[] = [
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

export const fortySixElksConfig: IConfigCredential[] = [
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

export const kannelConfig: IConfigCredential[] = [
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

export const maqsamConfig: IConfigCredential[] = [
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

export const smsCentralConfig: IConfigCredential[] = [
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

export const emailWebhookConfig: IConfigCredential[] = [
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

export const africasTalkingConfig: IConfigCredential[] = [
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

export const novuInAppConfig: IConfigCredential[] = [
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

export const sendchampConfig: IConfigCredential[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    type: 'string',
    required: true,
  },
  ...smsConfigBase,
];

export const clickSendConfig: IConfigCredential[] = [
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

export const simpleTextingConfig: IConfigCredential[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    type: 'text',
    required: true,
  },
  ...smsConfigBase,
];

export const bandwidthConfig: IConfigCredential[] = [
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
    type: 'string',
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

export const genericSmsConfig: IConfigCredential[] = [
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

export const pusherBeamsConfig: IConfigCredential[] = [
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

export const azureSmsConfig: IConfigCredential[] = [
  {
    key: CredentialsKeyEnum.AccessKey,
    displayName: 'Connection string',
    description: 'Your Azure account connection string',
    type: 'text',
    required: true,
  },
  ...smsConfigBase,
];

export const rocketChatConfig: IConfigCredential[] = [
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

export const ringCentralConfig: IConfigCredential[] = [
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

export const brevoSmsConfig: IConfigCredential[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    type: 'string',
    required: true,
  },
  ...smsConfigBase,
];

export const eazySmsConfig: IConfigCredential[] = [
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

export const iMediaConfig: IConfigCredential[] = [
  {
    key: CredentialsKeyEnum.Token,
    displayName: 'API Token',
    type: 'string',
    required: true,
    description: 'Your iMedia API token',
  },
  ...smsConfigBase,
];

export const whatsAppBusinessConfig: IConfigCredential[] = [
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

export const mobishastraConfig: IConfigCredential[] = [
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

export const afroSmsConfig: IConfigCredential[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    type: 'string',
    required: true,
  },
  {
    key: CredentialsKeyEnum.SenderName,
    displayName: 'Sender Name',
    type: 'string',
    required: true,
  },
  ...smsConfigBase,
];

export const unifonicConfig: IConfigCredential[] = [
  {
    key: CredentialsKeyEnum.AppSid,
    displayName: 'App SID',
    description: 'Authentication string that uniquely identifies your application.',
    type: 'string',
    required: true,
  },
  {
    key: CredentialsKeyEnum.SenderId,
    displayName: 'Sender ID',
    description: 'The SenderID identifies who has sent the SMS message, typically a brand name',
    type: 'string',
    required: true,
  },
  ...smsConfigBase,
];

export const smsmodeProviderConfig: IConfigCredential[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    description: 'API key provided by smsmode',
    type: 'string',
    required: true,
  },
  ...smsConfigBase,
];

export const appIOConfig: IConfigCredential[] = [
  {
    key: CredentialsKeyEnum.AppIOBaseUrl,
    displayName: 'Base URL',
    description: 'Base URL of the App IO API (e.g., https://api.io.italia.it/api/v1)',
    type: 'text',
    required: true,
  },
  ...pushConfigBase,
];

export const sinchConfig: IConfigCredential[] = [
  {
    key: CredentialsKeyEnum.ServicePlanId,
    displayName: 'Service Plan ID',
    description: 'Your Sinch Service Plan ID',
    type: 'string',
    required: true,
  },
  {
    key: CredentialsKeyEnum.ApiToken,
    displayName: 'API Token',
    type: 'string',
    required: true,
  },
  {
    key: CredentialsKeyEnum.Region,
    displayName: 'Region',
    description: 'Select your Sinch region',
    type: 'dropdown',
    required: true,
    value: 'eu',
    dropdown: [
      { name: 'EU (Ireland, Sweden)', value: 'eu' },
      { name: 'US', value: 'us' },
      { name: 'Australia', value: 'au' },
      { name: 'Brazil', value: 'br' },
      { name: 'Canada', value: 'ca' },
    ],
  },
  ...smsConfigBase,
];

export const ISendProProviderConfig: IConfigCredential[] = [
  {
    key: CredentialsKeyEnum.ApiKey,
    displayName: 'API Key',
    description: 'This is API key for example provider',
    type: 'text',
    required: true,
  },
  {
    key: CredentialsKeyEnum.From,
    displayName: 'Sender',
    description: 'The sender of sms',
    type: 'text',
    required: false,
  },
];
