import { Injectable } from '@nestjs/common';
import {
  EnvironmentEntity,
  NotificationTemplateEntity,
  OrganizationEntity,
  SubscriberEntity,
  TopicEntity,
  UserEntity,
} from '@novu/dal';
import {
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

import { IProcessSubscriberBulkJobDto } from '../../dtos';
import { PinoLogger } from '../../logging';
import { CacheService, FeatureFlagsService } from '../../services';
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
  tenant: ITenantDefine | null;
  environmentName: string;
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
    protected featureFlagsService: FeatureFlagsService,
    protected logger: PinoLogger,
    protected queueChunkSize: number = 100
  ) {}

  protected async subscriberProcessQueueAddBulk(jobs: IProcessSubscriberBulkJobDto[]) {
    const isUsageTrackingInTriggerBaseEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_INCR_IF_EXIST_USAGE_ENABLED,
      defaultValue: false,
      organization: { _id: jobs[0].data.organizationId } as OrganizationEntity,
      environment: { _id: jobs[0].data.environmentId } as EnvironmentEntity,
      user: { _id: jobs[0].data.userId } as UserEntity,
    });

    return await Promise.all(
      _.chunk(jobs, this.queueChunkSize).map(async (chunk: IProcessSubscriberBulkJobDto[]) => {
        try {
          await this.subscriberProcessQueueService.addBulk(chunk);
        } catch (error) {
          this.logger.warn({ err: error }, 'Failed to add jobs to queue');
        }

        if (isUsageTrackingInTriggerBaseEnabled) {
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
        }
      })
    );
  }

  protected async sendToProcessSubscriberService(
    command: BaseTriggerCommand,
    subscribers: { subscriberId: string; topics?: Pick<TopicEntity, '_id' | 'key'>[] }[] | ISubscribersDefine[],
    subscriberSource: SubscriberSourceEnum
  ) {
    if (subscribers.length === 0) {
      return;
    }

    const jobs = mapSubscribersToJobs(subscriberSource, subscribers, command);

    return await this.subscriberProcessQueueAddBulk(jobs);
  }
}
