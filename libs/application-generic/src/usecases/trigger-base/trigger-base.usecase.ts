import { Injectable } from '@nestjs/common';
import {
  NotificationTemplateEntity,
  SubscriberEntity,
  TopicEntity,
  EnvironmentEntity,
  OrganizationEntity,
  UserEntity,
} from '@novu/dal';
import {
  ISubscribersDefine,
  ITenantDefine,
  SubscriberSourceEnum,
  TriggerOverrides,
  TriggerRequestCategoryEnum,
  StatelessControls,
  ResourceEnum,
  FeatureFlagsKeysEnum,
} from '@novu/shared';
import _ from 'lodash';

import { IProcessSubscriberBulkJobDto } from '../../dtos';
import { SubscriberProcessQueueService } from '../../services/queues/subscriber-process-queue.service';
import { buildUsageKey } from '../../services/cache/key-builders';
import { CacheService, FeatureFlagsService } from '../../services';

export type BaseTriggerCommand = {
  environmentId: string;
  organizationId: string;
  userId: string;
  transactionId: string;
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
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.subscriberProcessQueueService.addBulk(chunk);

        if (isUsageTrackingInTriggerBaseEnabled) {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          this.cacheService.incrIfExistsAtomic(
            buildUsageKey({
              _organizationId: jobs[0].data.organizationId,
              resourceType: ResourceEnum.EVENTS,
            }),
            chunk.length
          );
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

    const jobs = this.mapSubscribersToJobs(subscriberSource, subscribers, command);

    return await this.subscriberProcessQueueAddBulk(jobs);
  }

  protected mapSubscribersToJobs(
    subscriberSource: SubscriberSourceEnum,
    subscribers: { subscriberId: string; topics?: Pick<TopicEntity, '_id' | 'key'>[] }[] | ISubscribersDefine[],
    command: BaseTriggerCommand
  ): IProcessSubscriberBulkJobDto[] {
    return subscribers.map((subscriber) => {
      const job: IProcessSubscriberBulkJobDto = {
        name: command.transactionId + subscriber.subscriberId,
        data: {
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          userId: command.userId,
          transactionId: command.transactionId,
          identifier: command.identifier,
          payload: command.payload,
          overrides: command.overrides,
          subscriber,
          topics: subscriber.topics,
          templateId: command.template._id,
          _subscriberSource: subscriberSource,
          requestCategory: command.requestCategory,
          controls: command.controls,
          bridge: {
            url: command.bridgeUrl,
            workflow: command.bridgeWorkflow,
          },
          environmentName: command.environmentName,
        },
        groupId: command.organizationId,
      };

      if (command.actor) {
        job.data.actor = command.actor;
      }
      if (command.tenant) {
        job.data.tenant = command.tenant;
      }

      return job;
    });
  }
}
