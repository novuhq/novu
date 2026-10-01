import { SubscriberEntity } from '@novu/dal';
import { DiscoverWorkflowOutput } from '@novu/framework/internal';
import {
  ContextPayload,
  ISubscribersDefine,
  ITenantDefine,
  StatelessControls,
  SubscriberSourceEnum,
  TriggerOverrides,
  TriggerRequestCategoryEnum,
} from '@novu/shared';

import { IBulkJobParams, IJobParams } from '../services/queues/queue-base.service';
import { SubscriberTopicPreference } from './subscriber-topic-preference.dto';

export interface IProcessSubscriberDataDto {
  environmentId: string;
  organizationId: string;
  userId: string;
  transactionId: string;
  requestId: string;
  identifier: string;
  // biome-ignore lint/suspicious/noExplicitAny: the trigger payload is arbitrary customer JSON
  payload: any;
  overrides: TriggerOverrides;
  _agentId?: string | null;
  tenant?: ITenantDefine;
  actor?: SubscriberEntity;
  contextKeys: string[];
  context?: ContextPayload;
  subscriber: ISubscribersDefine;
  templateId: string;
  _subscriberSource: SubscriberSourceEnum;
  topics?: SubscriberTopicPreference[];
  requestCategory?: TriggerRequestCategoryEnum;
  bridge?: { url: string; workflow: DiscoverWorkflowOutput };
  controls?: StatelessControls;
  /**
   * Set at enqueue by `TriggerBase` when IS_USAGE_COUNTER_WORKER_INCREMENT_ENABLED is on; the usage counter is
   * then incremented at workflow-run creation only for stamped jobs, so jobs queued before the flag flips are
   * never counted twice (NV-8853).
   */
  incrementUsageInWorker?: boolean;
}

export interface IProcessSubscriberJobDto extends IJobParams {
  data?: IProcessSubscriberDataDto;
}

export interface IProcessSubscriberBulkJobDto extends IBulkJobParams {
  data: IProcessSubscriberDataDto;
}
