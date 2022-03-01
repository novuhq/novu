import { ProviderEnum } from './provider.enum';
import { IProvider } from './provider.interface';

export { ProviderEnum } from './provider.enum';

export const providers: IProvider[] = [
  {
    id: 'mailjs',
    displayName: 'Mail.js',
    type: ProviderEnum.MAIL,
  },
  {
    id: 'mailgun',
    displayName: 'Mailgun',
    type: ProviderEnum.MAIL,
  },
  {
    id: 'mailjet',
    displayName: 'Mailjet',
    type: ProviderEnum.MAIL,
  },
  {
    id: 'mandrill',
    displayName: 'Mandrill',
    type: ProviderEnum.MAIL,
  },
  {
    id: 'nexmo',
    displayName: 'Nexmo',
    type: ProviderEnum.SMS,
  },
  {
    id: 'nodemailer',
    displayName: 'Nodemailer',
    type: ProviderEnum.MAIL,
  },
  {
    id: 'plivo',
    displayName: 'Plivo',
    type: ProviderEnum.SMS,
  },
  {
    id: 'postmark',
    displayName: 'Postmark',
    type: ProviderEnum.MAIL,
  },
  {
    id: 'sendgrid',
    displayName: 'SendGrid',
    type: ProviderEnum.MAIL,
  },
  {
    id: 'sendinblue',
    displayName: 'Sendinblue',
    type: ProviderEnum.MAIL,
  },
  {
    id: 'ses',
    displayName: 'SES',
    type: ProviderEnum.MAIL,
  },
  {
    id: 'sms77',
    displayName: 'sms77',
    type: ProviderEnum.SMS,
  },
  {
    id: 'sns',
    displayName: 'SNS',
    type: ProviderEnum.SMS,
  },
  {
    id: 'telnyx',
    displayName: 'Telnyx',
    type: ProviderEnum.SMS,
  },
  {
    id: 'twilio',
    displayName: 'Twilio',
    type: ProviderEnum.SMS,
  },
];
