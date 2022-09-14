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
}

export enum EmailProviderIdEnum {
  EmailJS = 'emailjs',
  Mailgun = 'mailgun',
  Mailjet = 'mailjet',
  Mandrill = 'mandrill',
  Nodemailer = 'nodemailer',
  Postmark = 'postmark',
  SendGrid = 'sendgrid',
  Sendinblue = 'sendinblue',
  SES = 'ses',
  NetCore = 'netcore',
}

export enum SmsProviderIdEnum {
  Nexmo = 'nexmo',
  Plivo = 'plivo',
  Sms77 = 'sms77',
  SNS = 'sns',
  Telnyx = 'telnyx',
  Twilio = 'twilio',
  Gupshup = 'gupshup',
}

export enum ChatProviderIdEnum {
  Slack = 'slack',
  Discord = 'discord',
}

export enum PushProviderIdEnum {
  FCM = 'fcm',
}

export enum InAppProviderIdEnum {
  Novu = 'novu',
}
