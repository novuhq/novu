import { EmailProviderIdEnum } from '@novu/shared';
import { genericProviderSchemas } from '../generic';
import { EmailProvidersSchemas } from '../types';
import { sendgridProviderSchemas } from './sendgrid';

export const emailProviderSchemas: EmailProvidersSchemas = {
  [EmailProviderIdEnum.SendGrid]: sendgridProviderSchemas,
  [EmailProviderIdEnum.EmailJS]: genericProviderSchemas,
  [EmailProviderIdEnum.Mailgun]: genericProviderSchemas,
  [EmailProviderIdEnum.Mailjet]: genericProviderSchemas,
  [EmailProviderIdEnum.Mandrill]: genericProviderSchemas,
  [EmailProviderIdEnum.CustomSMTP]: genericProviderSchemas,
  [EmailProviderIdEnum.Postmark]: genericProviderSchemas,
  [EmailProviderIdEnum.Sendinblue]: genericProviderSchemas,
  [EmailProviderIdEnum.SES]: genericProviderSchemas,
  [EmailProviderIdEnum.NetCore]: genericProviderSchemas,
  [EmailProviderIdEnum.Infobip]: genericProviderSchemas,
  [EmailProviderIdEnum.Resend]: genericProviderSchemas,
  [EmailProviderIdEnum.Plunk]: genericProviderSchemas,
  [EmailProviderIdEnum.MailerSend]: genericProviderSchemas,
  [EmailProviderIdEnum.Mailtrap]: genericProviderSchemas,
  [EmailProviderIdEnum.Clickatell]: genericProviderSchemas,
  [EmailProviderIdEnum.Outlook365]: genericProviderSchemas,
  [EmailProviderIdEnum.Novu]: genericProviderSchemas,
  [EmailProviderIdEnum.SparkPost]: genericProviderSchemas,
  [EmailProviderIdEnum.EmailWebhook]: genericProviderSchemas,
  [EmailProviderIdEnum.Braze]: genericProviderSchemas,
};
