import { ISubscribersDefine, ITenantDefine, ITopic, ProvidersIdEnum } from '../../types';

export type TriggerRecipientSubscriber = string | ISubscribersDefine;

export type TriggerRecipient = TriggerRecipientSubscriber | ITopic;

export type TriggerRecipients = TriggerRecipient[];

export type TriggerRecipientsPayload = TriggerRecipientSubscriber | TriggerRecipients;

export type TriggerTenantContext = string | ITenantDefine;

export type TriggerOverrides = {
  steps: Record<
    string,
    {
      providers: Record<ProvidersIdEnum, Record<string, unknown>>;
    }
  >;
  [key: string]: Record<string, Record<string, unknown>> | Record<string, unknown>;
};
