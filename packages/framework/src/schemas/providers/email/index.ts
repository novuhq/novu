import { EmailProviderIdEnum } from '@novu/shared';
import { Schema } from '../../../types';
import { genericProviderSchemas } from '../generic.schema';
import { novuEmailProviderSchemas } from './novu-email.schema';
import { sendgridProviderSchemas } from './sendgrid.schema';

export const emailProviderSchemas = {
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
  [EmailProviderIdEnum.Novu]: novuEmailProviderSchemas,
  [EmailProviderIdEnum.SparkPost]: genericProviderSchemas,
  [EmailProviderIdEnum.EmailWebhook]: genericProviderSchemas,
  [EmailProviderIdEnum.Braze]: genericProviderSchemas,
} satisfies Record<EmailProviderIdEnum, { output: Schema }>;
