import { Injectable } from '@nestjs/common';
import { NotificationTemplateEntity, SubscriberEntity } from '@novu/dal';
import { DiscoverWorkflowOutput } from '@novu/framework/internal';
import {
  ContextPayload,
  FeatureFlagsKeysEnum,
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
import { CacheService } from '../../services/cache';
import { buildUsageKey } from '../../services/cache/key-builders';
import { FeatureFlagsService } from '../../services/feature-flags';
import { SubscriberProcessQueueService } from '../../services/queues/subscriber-process-queue.service';
import { mapSubscribersToJobs } from '../../utils/subscribers.utils';

export type BaseTriggerCommand = {
  environmentId: string;
  organizationId: string;
  userId: string;
  transactionId: string;
  // TODO: remove optional flag after all the workers are migrated to use requestId NV-6475
  requestId?: string;
  identifier: string;
  // biome-ignore lint/suspicious/noExplicitAny: the trigger payload is arbitrary customer JSON
  payload: any;
  overrides: TriggerOverrides;
  _agentId?: string | null;
  template: NotificationTemplateEntity;
  actor?: SubscriberEntity | undefined;
  contextKeys: string[];
  context?: ContextPayload;
  tenant: ITenantDefine | null;
  requestCategory?: TriggerRequestCategoryEnum;
  controls?: StatelessControls;
  bridgeUrl?: string;
  bridgeWorkflow?: DiscoverWorkflowOutput;
};

@Injectable()
export abstract class TriggerBase {
  constructor(
    protected subscriberProcessQueueService: SubscriberProcessQueueService,
    protected cacheService: CacheService,
    protected featureFlagsService: FeatureFlagsService,
    protected logger: PinoLogger,
    protected queueChunkSize: number = 100
  ) {}

  protected async subscriberProcessQueueAddBulk(jobs: IProcessSubscriberBulkJobDto[], incrementUsageInWorker: boolean) {
    return await Promise.all(
      _.chunk(jobs, this.queueChunkSize).map(async (chunk: IProcessSubscriberBulkJobDto[]) => {
        try {
          await this.subscriberProcessQueueService.addBulk(chunk);
        } catch (error) {
          this.logger.warn({ err: error }, 'Failed to add jobs to queue');
        }

        // Transitional: remove with IS_USAGE_COUNTER_WORKER_INCREMENT_ENABLED (NV-8853).
        if (incrementUsageInWorker) {
          return;
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

    const incrementUsageInWorker = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_USAGE_COUNTER_WORKER_INCREMENT_ENABLED,
      defaultValue: false,
      organization: { _id: command.organizationId },
    });

    const jobs = mapSubscribersToJobs(subscriberSource, subscribers, command);

    if (incrementUsageInWorker) {
      for (const job of jobs) {
        job.data.incrementUsageInWorker = true;
      }
    }

    return await this.subscriberProcessQueueAddBulk(jobs, incrementUsageInWorker);
  }
}
