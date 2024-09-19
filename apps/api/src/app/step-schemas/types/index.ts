import {
  ChatOutput,
  DelayOutput,
  DigestOutput,
  EmailOutput,
  InAppOutput,
  PushOutput,
  SmsOutput,
} from '@novu/framework';

export type StepOutputSchema =
  | SmsOutput
  | EmailOutput
  | PushOutput
  | ChatOutput
  | InAppOutput
  | DelayOutput
  | DigestOutput
  | Record<string, unknown>;
