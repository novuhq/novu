import { ISubscribersDefine, ITopic, TopicKey } from '../../types';

export type TriggerRecipientSubscriber = string | ISubscribersDefine;

export type TriggerRecipient = TriggerRecipientSubscriber | ITopic;

export type TriggerRecipients = TriggerRecipient[];

export type TriggerRecipientsPayload = TriggerRecipientSubscriber | TriggerRecipients;
