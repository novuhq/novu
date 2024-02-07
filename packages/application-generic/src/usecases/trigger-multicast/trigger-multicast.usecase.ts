import { Injectable, NotFoundException } from '@nestjs/common';
import * as _ from 'lodash';

import {
  IntegrationRepository,
  JobRepository,
  NotificationTemplateRepository,
  SubscriberEntity,
  SubscriberRepository,
  TopicEntity,
  TopicRepository,
  TopicSubscribersRepository,
  TopicSubscribersEntity,
} from '@novu/dal';
import {
  FeatureFlagsKeysEnum,
  ISubscribersDefine,
  ITopic,
  SubscriberSourceEnum,
  TriggerRecipient,
  TriggerRecipientsTypeEnum,
  TriggerRecipientSubscriber,
} from '@novu/shared';

import { ProcessSubscriber } from '../process-subscriber';
import { PinoLogger } from '../../logging';
import { InstrumentUsecase } from '../../instrumentation';
import { ApiException } from '../../utils/exceptions';
import { ProcessTenant } from '../process-tenant';
import { MapTriggerRecipients } from '../map-trigger-recipients/map-trigger-recipients.use-case';
import { SubscriberProcessQueueService } from '../../services/queues/subscriber-process-queue.service';
import { TriggerMulticastCommand } from './trigger-multicast.command';
import { IProcessSubscriberBulkJobDto } from '../../dtos';
import { GetFeatureFlag, GetFeatureFlagCommand } from '../get-feature-flag';
import { GetTopicSubscribersUseCase } from '../get-topic-subscribers';

const LOG_CONTEXT = 'TriggerMulticastUseCase';
const QUEUE_CHUNK_SIZE = Number(process.env.MULTICAST_QUEUE_CHUNK_SIZE) || 100;

const isNotTopic = (
  recipient: TriggerRecipient
): recipient is TriggerRecipientSubscriber => !isTopic(recipient);

const isTopic = (recipient: TriggerRecipient): recipient is ITopic =>
  (recipient as ITopic).type &&
  (recipient as ITopic).type === TriggerRecipientsTypeEnum.TOPIC;

@Injectable()
export class TriggerMulticast {
  constructor(
    private processSubscriber: ProcessSubscriber,
    private integrationRepository: IntegrationRepository,
    private subscriberRepository: SubscriberRepository,
    private jobRepository: JobRepository,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private processTenant: ProcessTenant,
    private logger: PinoLogger,
    private mapTriggerRecipients: MapTriggerRecipients,
    private subscriberProcessQueueService: SubscriberProcessQueueService,
    private getTopicSubscribers: GetTopicSubscribersUseCase,
    private topicSubscribersRepository: TopicSubscribersRepository,
    private topicRepository: TopicRepository,
    private getFeatureFlag: GetFeatureFlag
  ) {}

  @InstrumentUsecase()
  async execute(command: TriggerMulticastCommand) {
    {
      const {
        environmentId,
        organizationId,
        to: recipients,
        actor,
        userId,
      } = command;

      const mappedRecipients = Array.isArray(recipients)
        ? recipients
        : [recipients];

      const { singleSubscribers, topicKeys } =
        this.splitByRecipientType(mappedRecipients);

      await this.sendToProcessSubscriberService(
        command,
        Array.from(singleSubscribers.values()),
        SubscriberSourceEnum.SINGLE
      );

      const isEnabled = await this.getFeatureFlag.execute(
        GetFeatureFlagCommand.create({
          environmentId,
          organizationId,
          userId,
          key: FeatureFlagsKeysEnum.IS_TOPIC_NOTIFICATION_ENABLED,
        })
      );

      if (!isEnabled || topicKeys.size === 0) {
        return;
      }

      const topics = await this.getTopicsByTopicKeys(
        organizationId,
        environmentId,
        topicKeys
      );

      this.validateTopicExist(topics, topicKeys);

      const topicIds = topics.map((topic) => topic._id);
      const singleSubscriberIds = Array.from(singleSubscribers.keys());
      const subscriberFetchBatchSize = 500;

      let page = 0;

      while (true) {
        const data =
          await this.topicSubscribersRepository.getDistinctSubscribers(
            {
              _organizationId: organizationId,
              _environmentId: environmentId,
              _topicId: { $in: topicIds },
              externalSubscriberId: { $nin: singleSubscriberIds },
            },
            {
              limit: subscriberFetchBatchSize,
              skip: page * subscriberFetchBatchSize,
            }
          );

        if (!data || data.length === 0) {
          break;
        }

        const subscribersDefine = this.buildSubscribersDefine(data, actor);
        await this.sendToProcessSubscriberService(
          command,
          subscribersDefine,
          SubscriberSourceEnum.TOPIC
        );

        page++;
      }
    }
  }

  private buildSubscribersDefine(
    data: TopicSubscribersEntity[],
    actor: SubscriberEntity
  ) {
    const subscriberDefines: ISubscribersDefine[] = [];

    for (const subscriber of data) {
      const subscriberDefine: ISubscribersDefine = {
        subscriberId: subscriber.externalSubscriberId,
      };

      if (!actor || actor.subscriberId !== subscriberDefine.subscriberId) {
        subscriberDefines.push(subscriberDefine);
      }
    }

    return subscriberDefines;
  }

  private async getTopicsByTopicKeys(
    organizationId: string,
    environmentId: string,
    topicKeys: Set<string>
  ): Promise<TopicEntity[]> {
    return await this.topicRepository.find(
      {
        _organizationId: organizationId,
        _environmentId: environmentId,
        key: { $in: Array.from(topicKeys) },
      },
      '_id'
    );
  }

  private validateTopicExist(topics: TopicEntity[], topicKeys: Set<string>) {
    if (topics.length !== topicKeys.size) {
      topicKeys.forEach((topicKey) => {
        if (!topics.find((topic) => topic.key === topicKey)) {
          throw new NotFoundException(
            `Topic with key ${topicKey} not found in current environment`
          );
        }
      });
    }
  }

  private splitByRecipientType(mappedRecipients: TriggerRecipient[]): {
    singleSubscribers: Map<string, ISubscribersDefine>;
    topicKeys: Set<string>;
  } {
    return mappedRecipients.reduce(
      (acc, recipient) => {
        if (isTopic(recipient)) {
          acc.topicKeys.add(recipient.topicKey);
        } else {
          const subscribersDefine = this.buildSubscriberDefine(recipient);

          acc.singleSubscribers.set(
            subscribersDefine.subscriberId,
            subscribersDefine
          );
        }

        return acc;
      },
      {
        singleSubscribers: new Map<string, ISubscribersDefine>(),
        topicKeys: new Set<string>(),
      }
    );
  }

  private mapSubscribersToJobs(
    _subscriberSource: SubscriberSourceEnum,
    subscribers: ISubscribersDefine[],
    command: TriggerMulticastCommand
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
          subscriber: subscriber,
          templateId: command.template._id,
          _subscriberSource: _subscriberSource,
          requestCategory: command.requestCategory,
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

  private buildSubscriberDefine(
    recipient: TriggerRecipientSubscriber
  ): ISubscribersDefine {
    if (typeof recipient === 'string') {
      return { subscriberId: recipient };
    } else {
      this.validateSubscriberDefine(recipient);

      return recipient;
    }
  }

  private validateSubscriberDefine(recipient: ISubscribersDefine) {
    if (Array.isArray(recipient)) {
      throw new ApiException(
        'subscriberId under property to is type array, which is not allowed please make sure all subscribers ids are strings'
      );
    }

    if (!recipient) {
      throw new ApiException(
        'subscriberId under property to is not configured, please make sure all subscribers contains subscriberId property'
      );
    }
  }

  private async subscriberProcessQueueAddBulk(
    jobs: IProcessSubscriberBulkJobDto[]
  ) {
    return await Promise.all(
      _.chunk(jobs, QUEUE_CHUNK_SIZE).map(
        (chunk: IProcessSubscriberBulkJobDto[]) =>
          this.subscriberProcessQueueService.addBulk(chunk)
      )
    );
  }

  private async sendToProcessSubscriberService(
    command: TriggerMulticastCommand,
    subscribers: ISubscribersDefine[],
    _subscriberSource: SubscriberSourceEnum
  ) {
    if (subscribers.length === 0) {
      return;
    }

    const jobs = this.mapSubscribersToJobs(
      _subscriberSource,
      subscribers,
      command
    );

    return await this.subscriberProcessQueueAddBulk(jobs);
  }
}
