import { IProvider } from './provider.interface';
import { ChannelTypeEnum } from '../../entities/message-template';

export const providers: IProvider[] = [
  {
    id: 'mailjs',
    displayName: 'Mail.js',
    channel: ChannelTypeEnum.EMAIL,
  },
  {
    id: 'mailgun',
    displayName: 'Mailgun',
    channel: ChannelTypeEnum.EMAIL,
  },
  {
    id: 'mailjet',
    displayName: 'Mailjet',
    channel: ChannelTypeEnum.EMAIL,
  },
  {
    id: 'mandrill',
    displayName: 'Mandrill',
    channel: ChannelTypeEnum.EMAIL,
  },
  {
    id: 'nexmo',
    displayName: 'Nexmo',
    channel: ChannelTypeEnum.SMS,
  },
  {
    id: 'nodemailer',
    displayName: 'Nodemailer',
    channel: ChannelTypeEnum.EMAIL,
  },
  {
    id: 'plivo',
    displayName: 'Plivo',
    channel: ChannelTypeEnum.SMS,
  },
  {
    id: 'postmark',
    displayName: 'Postmark',
    channel: ChannelTypeEnum.EMAIL,
  },
  {
    id: 'sendgrid',
    displayName: 'SendGrid',
    channel: ChannelTypeEnum.EMAIL,
  },
  {
    id: 'sendinblue',
    displayName: 'Sendinblue',
    channel: ChannelTypeEnum.EMAIL,
  },
  {
    id: 'ses',
    displayName: 'SES',
    channel: ChannelTypeEnum.EMAIL,
  },
  {
    id: 'sms77',
    displayName: 'sms77',
    channel: ChannelTypeEnum.SMS,
  },
  {
    id: 'sns',
    displayName: 'SNS',
    channel: ChannelTypeEnum.SMS,
  },
  {
    id: 'telnyx',
    displayName: 'Telnyx',
    channel: ChannelTypeEnum.SMS,
  },
  {
    id: 'twilio',
    displayName: 'Twilio',
    channel: ChannelTypeEnum.SMS,
  },
];
