import { Schema } from '../../types/schema.types';
import {
  ChatProviderIdEnum,
  EmailProviderIdEnum,
  InAppProviderIdEnum,
  PushProviderIdEnum,
  SmsProviderIdEnum,
} from '@novu/shared';

type ProviderOutputs = { output: Schema };

export type ChatProvidersSchemas = Record<ChatProviderIdEnum, ProviderOutputs>;
export type EmailProvidersSchemas = Record<EmailProviderIdEnum, ProviderOutputs>;
export type PushProvidersSchemas = Record<PushProviderIdEnum, ProviderOutputs>;
export type InAppProvidersSchemas = Record<InAppProviderIdEnum, ProviderOutputs>;
export type SmsProvidersSchemas = Record<SmsProviderIdEnum, ProviderOutputs>;

export type ProvidersSchemas =
  | ChatProvidersSchemas
  | EmailProvidersSchemas
  | PushProvidersSchemas
  | InAppProvidersSchemas
  | SmsProvidersSchemas;
