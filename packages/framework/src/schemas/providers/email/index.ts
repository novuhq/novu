import { EmailProviderIdEnum } from '../../../shared';
import type { JsonSchema } from '../../../types/schema.types';
import { genericProviderSchemas } from '../generic.schema';
import { mailgunProviderSchemas } from './mailgun.schema';
import { mailjetProviderSchemas } from './mailjet.schema';
import { nodemailerProviderSchemas } from './nodemailer.schema';
import { novuEmailProviderSchemas } from './novu-email.schema';
import { sendgridProviderSchemas } from './sendgrid.schema';

export const emailProviderSchemas = {
  braze: genericProviderSchemas,
  clickatell: genericProviderSchemas,
  nodemailer: nodemailerProviderSchemas,
  emailjs: genericProviderSchemas,
  'email-webhook': genericProviderSchemas,
  'infobip-email': genericProviderSchemas,
  mailersend: genericProviderSchemas,
  mailgun: mailgunProviderSchemas,
  mailjet: mailjetProviderSchemas,
  mailtrap: genericProviderSchemas,
  mandrill: genericProviderSchemas,
  netcore: genericProviderSchemas,
  'novu-email': novuEmailProviderSchemas,
  outlook365: genericProviderSchemas,
  plunk: genericProviderSchemas,
  postmark: genericProviderSchemas,
  resend: genericProviderSchemas,
  sendgrid: sendgridProviderSchemas,
  sendinblue: genericProviderSchemas,
  ses: genericProviderSchemas,
  sparkpost: genericProviderSchemas,
} as const satisfies Record<EmailProviderIdEnum, { output: JsonSchema }>;
