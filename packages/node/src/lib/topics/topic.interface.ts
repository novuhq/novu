import { TriggerRecipientsTypeEnum } from '@novu/shared';

type TopicKey = string;

export interface ITopic {
  type: TriggerRecipientsTypeEnum.TOPIC;
  key: TopicKey;
}
