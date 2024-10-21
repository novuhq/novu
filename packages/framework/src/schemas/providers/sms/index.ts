import { SmsProviderIdEnum } from '@novu/shared';
import { Schema } from '../../../types/schema.types';
import { genericProviderSchemas } from '../generic.schema';
import { novuSmsProviderSchemas } from './novu-sms.schema';
import { twilioProviderSchemas } from './twilio.schema';

export const smsProviderSchemas = {
  [SmsProviderIdEnum.AfricasTalking]: genericProviderSchemas,
  [SmsProviderIdEnum.AzureSms]: genericProviderSchemas,
  [SmsProviderIdEnum.Bandwidth]: genericProviderSchemas,
  [SmsProviderIdEnum.BrevoSms]: genericProviderSchemas,
  [SmsProviderIdEnum.BulkSms]: genericProviderSchemas,
  [SmsProviderIdEnum.BurstSms]: genericProviderSchemas,
  [SmsProviderIdEnum.Clickatell]: genericProviderSchemas,
  [SmsProviderIdEnum.Clicksend]: genericProviderSchemas,
  [SmsProviderIdEnum.EazySms]: genericProviderSchemas,
  [SmsProviderIdEnum.Firetext]: genericProviderSchemas,
  [SmsProviderIdEnum.FortySixElks]: genericProviderSchemas,
  [SmsProviderIdEnum.GenericSms]: genericProviderSchemas,
  [SmsProviderIdEnum.Gupshup]: genericProviderSchemas,
  [SmsProviderIdEnum.Infobip]: genericProviderSchemas,
  [SmsProviderIdEnum.ISendSms]: genericProviderSchemas,
  [SmsProviderIdEnum.Kannel]: genericProviderSchemas,
  [SmsProviderIdEnum.Maqsam]: genericProviderSchemas,
  [SmsProviderIdEnum.MessageBird]: genericProviderSchemas,
  [SmsProviderIdEnum.Mobishastra]: genericProviderSchemas,
  [SmsProviderIdEnum.Nexmo]: genericProviderSchemas,
  [SmsProviderIdEnum.Novu]: novuSmsProviderSchemas,
  [SmsProviderIdEnum.Plivo]: genericProviderSchemas,
  [SmsProviderIdEnum.RingCentral]: genericProviderSchemas,
  [SmsProviderIdEnum.Sendchamp]: genericProviderSchemas,
  [SmsProviderIdEnum.Simpletexting]: genericProviderSchemas,
  [SmsProviderIdEnum.Sms77]: genericProviderSchemas,
  [SmsProviderIdEnum.SmsCentral]: genericProviderSchemas,
  [SmsProviderIdEnum.SNS]: genericProviderSchemas,
  [SmsProviderIdEnum.Telnyx]: genericProviderSchemas,
  [SmsProviderIdEnum.Termii]: genericProviderSchemas,
  [SmsProviderIdEnum.Twilio]: twilioProviderSchemas,
} satisfies Record<SmsProviderIdEnum, { output: Schema }>;
