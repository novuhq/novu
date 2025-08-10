import { SubscriberEntity, TopicEntity } from '@novu/dal';
import { DiscoverWorkflowOutput } from '@novu/framework/internal';
import {
  ISubscribersDefine,
  ITenantDefine,
  StatelessControls,
  SubscriberSourceEnum,
  TriggerOverrides,
  TriggerRequestCategoryEnum,
} from '@novu/shared';

import { IBulkJobParams, IJobParams } from '../services/queues/queue-base.service';

export interface IProcessSubscriberDataDto {
  environmentId: string;
  environmentName: string;
  organizationId: string;
  userId: string;
  transactionId: string;
  requestId: string;
  identifier: string;
  payload: any;
  overrides: TriggerOverrides;
  tenant?: ITenantDefine;
  actor?: SubscriberEntity;
  subscriber: ISubscribersDefine;
  templateId: string;
  _subscriberSource: SubscriberSourceEnum;
  topics?: Pick<TopicEntity, '_id' | 'key'>[];
  requestCategory?: TriggerRequestCategoryEnum;
  bridge?: { url: string; workflow: DiscoverWorkflowOutput };
  controls?: StatelessControls;
}

export interface IProcessSubscriberJobDto extends IJobParams {
  data?: IProcessSubscriberDataDto;
}

export interface IProcessSubscriberBulkJobDto extends IBulkJobParams {
  data: IProcessSubscriberDataDto;
}
