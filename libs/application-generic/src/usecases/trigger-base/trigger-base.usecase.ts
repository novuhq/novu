import { Injectable } from '@nestjs/common';
import { NotificationTemplateEntity, SubscriberEntity } from '@novu/dal';
import {
  ISubscribersDefine,
  ITenantDefine,
  ResourceEnum,
  StatelessControls,
  SubscriberSourceEnum,
  TriggerOverrides,
  TriggerRequestCategoryEnum,
} from '@novu/shared';
import _ from 'lodash';

import { IProcessSubscriberBulkJobDto, SubscriberTopicPreference } from '../../dtos';
import { PinoLogger } from '../../logging';
import { CacheService } from '../../services';
import { buildUsageKey } from '../../services/cache/key-builders';
import { SubscriberProcessQueueService } from '../../services/queues/subscriber-process-queue.service';
import { mapSubscribersToJobs } from '../../utils';

export type BaseTriggerCommand = {
  environmentId: string;
  organizationId: string;
  userId: string;
  transactionId: string;
  // TODO: remove optional flag after all the workers are migrated to use requestId NV-6475
  requestId?: string;
  identifier: string;
  payload: any;
  overrides: TriggerOverrides;
  template: NotificationTemplateEntity;
  actor?: SubscriberEntity | undefined;
  contextKeys: string[];
  tenant: ITenantDefine | null;
  requestCategory?: TriggerRequestCategoryEnum;
  controls?: StatelessControls;
  bridgeUrl?: string;
  bridgeWorkflow?: any;
};

@Injectable()
export abstract class TriggerBase {
  constructor(
    protected subscriberProcessQueueService: SubscriberProcessQueueService,
    protected cacheService: CacheService,
    protected logger: PinoLogger,
    protected queueChunkSize: number = 100
  ) {}

  protected async subscriberProcessQueueAddBulk(jobs: IProcessSubscriberBulkJobDto[]) {
    return await Promise.all(
      _.chunk(jobs, this.queueChunkSize).map(async (chunk: IProcessSubscriberBulkJobDto[]) => {
        try {
          await this.subscriberProcessQueueService.addBulk(chunk);
        } catch (error) {
          this.logger.warn({ err: error }, 'Failed to add jobs to queue');
        }

        try {
          await this.cacheService.incrIfExistsAtomic(
            buildUsageKey({
              _organizationId: jobs[0].data.organizationId,
              resourceType: ResourceEnum.EVENTS,
            }),
            chunk.length
          );
        } catch (error) {
          this.logger.warn({ err: error }, 'Failed to increment usage counter');
        }
      })
    );
  }

  protected async sendToProcessSubscriberService(
    command: BaseTriggerCommand,
    subscribers:
      | {
          subscriberId: string;
          topics?: Array<SubscriberTopicPreference>;
        }[]
      | ISubscribersDefine[],
    subscriberSource: SubscriberSourceEnum
  ) {
    if (subscribers.length === 0) {
      return;
    }

    const jobs = mapSubscribersToJobs(subscriberSource, subscribers, command);

    return await this.subscriberProcessQueueAddBulk(jobs);
  }
}
