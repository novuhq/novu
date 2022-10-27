/* eslint-disable @typescript-eslint/naming-convention */

export enum CredentialsKeyEnum {
  Subscribe = 'subscribe',
  ApiKey = 'apiKey',
  User = 'user',
  UserId = 'userid',
  Tags = 'tags',
  NotificationImageURL = 'notificationimageurl',
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
  ApplicationCode = 'applicationCode',
  NotificationTitle = 'notificationTitle',
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
  Firetext = 'firetext',
}

export enum ChatProviderIdEnum {
  Slack = 'slack',
  Discord = 'discord',
}

export enum PushProviderIdEnum {
  FCM = 'fcm',
  APNS = 'apns',
  EXPO = 'expo',
  Pushwoosh = 'pushwoosh',
}

export enum InAppProviderIdEnum {
  Novu = 'novu',
}
