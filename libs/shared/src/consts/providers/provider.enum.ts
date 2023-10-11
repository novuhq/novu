/* eslint-disable @typescript-eslint/naming-convention */

export enum CredentialsKeyEnum {
  ApiKey = 'apiKey',
  User = 'user',
  SecretKey = 'secretKey',
  Domain = 'domain',
  Password = 'password',
  Host = 'host',
  Port = 'port',
  Secure = 'secure',
  Region = 'region',
  AccountSid = 'accountSid',
  MessageProfileId = 'messageProfileId',
  Token = 'token',
  From = 'from',
  SenderName = 'senderName',
  ApplicationId = 'applicationId',
  ClientId = 'clientId',
  ProjectName = 'projectName',
  ServiceAccount = 'serviceAccount',
  BaseUrl = 'baseUrl',
  WebhookUrl = 'webhookUrl',
  RequireTls = 'requireTls',
  IgnoreTls = 'ignoreTls',
  TlsOptions = 'tlsOptions',
  RedirectUrl = 'redirectUrl',
  Hmac = 'hmac',
  IpPoolName = 'ipPoolName',
}

export enum EmailProviderIdEnum {
  EmailJS = 'emailjs',
  Mailgun = 'mailgun',
  Mailjet = 'mailjet',
  Mandrill = 'mandrill',
  CustomSMTP = 'nodemailer',
  Postmark = 'postmark',
  SendGrid = 'sendgrid',
  Sendinblue = 'sendinblue',
  SES = 'ses',
  NetCore = 'netcore',
  Infobip = 'infobip-email',
  Resend = 'resend',
  Plunk = 'plunk',
  MailerSend = 'mailersend',
  Mailtrap = 'mailtrap',
  Clickatell = 'clickatell',
  Outlook365 = 'outlook365',
  Novu = 'novu-email',
  SparkPost = 'sparkpost',
  EmailWebhook = 'email-webhook',
}

export enum SmsProviderIdEnum {
  Nexmo = 'nexmo',
  Plivo = 'plivo',
  Sms77 = 'sms77',
  SmsCentral = 'sms-central',
  SNS = 'sns',
  Telnyx = 'telnyx',
  Twilio = 'twilio',
  Gupshup = 'gupshup',
  Firetext = 'firetext',
  Infobip = 'infobip-sms',
  BurstSms = 'burst-sms',
  Clickatell = 'clickatell',
  FortySixElks = 'forty-six-elks',
  Kannel = 'kannel',
  Maqsam = 'maqsam',
  Termii = 'termii',
  AfricasTalking = 'africas-talking',
  Novu = 'novu-sms',
  Sendchamp = 'sendchamp',
  Clicksend = 'clicksend',
}

export enum ChatProviderIdEnum {
  Slack = 'slack',
  Discord = 'discord',
  MsTeams = 'msteams',
  Mattermost = 'mattermost',
}

export enum PushProviderIdEnum {
  FCM = 'fcm',
  APNS = 'apns',
  EXPO = 'expo',
  OneSignal = 'one-signal',
  PushWebhook = 'push-webhook',
}

export enum InAppProviderIdEnum {
  Novu = 'novu',
}

export type ProvidersIdEnum =
  | EmailProviderIdEnum
  | SmsProviderIdEnum
  | PushProviderIdEnum
  | InAppProviderIdEnum
  | ChatProviderIdEnum;
