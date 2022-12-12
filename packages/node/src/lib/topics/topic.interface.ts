import { TopicId, TriggerRecipientsTypeEnum } from '@novu/shared';

export interface ITopic {
  type: TriggerRecipientsTypeEnum.TOPIC;
  topicId: TopicId;
}
