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
  MailerSend = 'mailersend',
  Clickatell = 'clickatell',
  Outlook365 = 'outlook365',
  Novu = 'novu-email',
  SparkPost = 'sparkpost',
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
}

export enum InAppProviderIdEnum {
  Novu = 'novu',
}
