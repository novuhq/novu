import { SmsProviderIdEnum } from '../../../shared';
import type { JsonSchema } from '../../../types/schema.types';
import { genericProviderSchemas } from '../generic.schema';
import { novuSmsProviderSchemas } from './novu-sms.schema';
import { twilioProviderSchemas } from './twilio.schema';

export const smsProviderSchemas = {
  'africas-talking': genericProviderSchemas,
  'azure-sms': genericProviderSchemas,
  bandwidth: genericProviderSchemas,
  'brevo-sms': genericProviderSchemas,
  'bulk-sms': genericProviderSchemas,
  'burst-sms': genericProviderSchemas,
  clickatell: genericProviderSchemas,
  clicksend: genericProviderSchemas,
  'eazy-sms': genericProviderSchemas,
  firetext: genericProviderSchemas,
  'forty-six-elks': genericProviderSchemas,
  'generic-sms': genericProviderSchemas,
  gupshup: genericProviderSchemas,
  'infobip-sms': genericProviderSchemas,
  'isend-sms': genericProviderSchemas,
  kannel: genericProviderSchemas,
  maqsam: genericProviderSchemas,
  messagebird: genericProviderSchemas,
  mobishastra: genericProviderSchemas,
  nexmo: genericProviderSchemas,
  'novu-sms': novuSmsProviderSchemas,
  plivo: genericProviderSchemas,
  'ring-central': genericProviderSchemas,
  sendchamp: genericProviderSchemas,
  simpletexting: genericProviderSchemas,
  sms77: genericProviderSchemas,
  'sms-central': genericProviderSchemas,
  smsmode: genericProviderSchemas,
  sns: genericProviderSchemas,
  telnyx: genericProviderSchemas,
  termii: genericProviderSchemas,
  twilio: twilioProviderSchemas,
  'afro-message': genericProviderSchemas,
  unifonic: genericProviderSchemas,
  imedia: genericProviderSchemas,
} as const satisfies Record<SmsProviderIdEnum, { output: JsonSchema }>;
