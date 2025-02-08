import { StepTypeEnum } from '@novu/shared';
import { ExecutionDetailsEntity } from '../execution-details';
import { JobEntity } from '../job';
import { NotificationTemplateEntity } from '../notification-template';
import { SubscriberEntity } from '../subscriber';
import { NotificationEntity } from './notification.entity';

export type NotificationFeedItemEntity = Omit<NotificationEntity, 'template'> & {
  template?: TemplateFeedItem;
  subscriber?: SubscriberFeedItem;
  jobs: JobFeedItem[];
};
export type TemplateFeedItem = Pick<NotificationTemplateEntity, '_id' | 'name' | 'triggers'>;

export type SubscriberFeedItem = Pick<
  SubscriberEntity,
  '_id' | 'firstName' | 'lastName' | 'email' | 'subscriberId' | 'phone'
>;

export type JobFeedItem = Pick<
  JobEntity,
  '_id' | 'status' | 'payload' | 'step' | 'type' | 'providerId' | 'createdAt' | 'updatedAt' | 'digest'
> & {
  executionDetails: ExecutionDetailFeedItem[]; // Assuming ExecutionDetailFeedItem is defined
  type: StepTypeEnum;
};

export type ExecutionDetailFeedItem = Pick<
  ExecutionDetailsEntity,
  '_id' | 'providerId' | 'detail' | 'source' | '_jobId' | 'status' | 'isTest' | 'isRetry' | 'createdAt' | 'raw'
>;
