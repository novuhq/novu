import { EmailProviderIdEnum } from '@novu/shared';
import { Schema } from '../../../types/schema.types';
import { genericProviderSchemas } from '../generic.schema';
import { mailgunProviderSchemas } from './mailgun.schema';
import { mailjetProviderSchemas } from './mailjet.schema';
import { nodemailerProviderSchemas } from './nodemailer.schema';
import { novuEmailProviderSchemas } from './novu-email.schema';
import { sendgridProviderSchemas } from './sendgrid.schema';

export const emailProviderSchemas = {
  [EmailProviderIdEnum.Braze]: genericProviderSchemas,
  [EmailProviderIdEnum.Clickatell]: genericProviderSchemas,
  [EmailProviderIdEnum.CustomSMTP]: nodemailerProviderSchemas,
  [EmailProviderIdEnum.EmailJS]: genericProviderSchemas,
  [EmailProviderIdEnum.EmailWebhook]: genericProviderSchemas,
  [EmailProviderIdEnum.Infobip]: genericProviderSchemas,
  [EmailProviderIdEnum.MailerSend]: genericProviderSchemas,
  [EmailProviderIdEnum.Mailgun]: mailgunProviderSchemas,
  [EmailProviderIdEnum.Mailjet]: mailjetProviderSchemas,
  [EmailProviderIdEnum.Mailtrap]: genericProviderSchemas,
  [EmailProviderIdEnum.Mandrill]: genericProviderSchemas,
  [EmailProviderIdEnum.NetCore]: genericProviderSchemas,
  [EmailProviderIdEnum.Novu]: novuEmailProviderSchemas,
  [EmailProviderIdEnum.Outlook365]: genericProviderSchemas,
  [EmailProviderIdEnum.Plunk]: genericProviderSchemas,
  [EmailProviderIdEnum.Postmark]: genericProviderSchemas,
  [EmailProviderIdEnum.Resend]: genericProviderSchemas,
  [EmailProviderIdEnum.SendGrid]: sendgridProviderSchemas,
  [EmailProviderIdEnum.Sendinblue]: genericProviderSchemas,
  [EmailProviderIdEnum.SES]: genericProviderSchemas,
  [EmailProviderIdEnum.SparkPost]: genericProviderSchemas,
} satisfies Record<EmailProviderIdEnum, { output: Schema }>;
