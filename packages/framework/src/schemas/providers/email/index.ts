import { genericProviderSchemas } from '../generic';
import { sendgridProviderSchemas } from './sendgrid';

export const emailProviderSchemas = {
  sendgrid: sendgridProviderSchemas,
  braze: genericProviderSchemas,
  brevo: genericProviderSchemas,
  emailjs: genericProviderSchemas,
  infobip: genericProviderSchemas,
  mailersend: genericProviderSchemas,
  mailgun: genericProviderSchemas,
  mailjet: genericProviderSchemas,
  mailtrap: genericProviderSchemas,
  mandrill: genericProviderSchemas,
  netcore: genericProviderSchemas,
  nodemailer: genericProviderSchemas,
  outlook365: genericProviderSchemas,
  plunk: genericProviderSchemas,
  postmark: genericProviderSchemas,
  resend: genericProviderSchemas,
  ses: genericProviderSchemas,
  novu: genericProviderSchemas,
};
