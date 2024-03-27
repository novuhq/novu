import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import * as _ from 'lodash';
import {
  TopicEntity,
  TopicRepository,
  TopicSubscribersRepository,
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

import { PinoLogger } from '../../logging';
import { InstrumentUsecase } from '../../instrumentation';
import { ApiException } from '../../utils/exceptions';
import { SubscriberProcessQueueService } from '../../services/queues/subscriber-process-queue.service';
import { TriggerMulticastCommand } from './trigger-multicast.command';
import { IProcessSubscriberBulkJobDto } from '../../dtos';
import { GetFeatureFlag, GetFeatureFlagCommand } from '../get-feature-flag';

const LOG_CONTEXT = 'TriggerMulticastUseCase';
const QUEUE_CHUNK_SIZE = Number(process.env.MULTICAST_QUEUE_CHUNK_SIZE) || 100;
const SUBSCRIBER_TOPIC_DISTINCT_BATCH_SIZE =
  Number(process.env.SUBSCRIBER_TOPIC_DISTINCT_BATCH_SIZE) || 100;

const isNotTopic = (
  recipient: TriggerRecipient
): recipient is TriggerRecipientSubscriber => !isTopic(recipient);

const isTopic = (recipient: TriggerRecipient): recipient is ITopic =>
  (recipient as ITopic).type &&
  (recipient as ITopic).type === TriggerRecipientsTypeEnum.TOPIC;

@Injectable()
export class TriggerMulticast {
  constructor(
    private logger: PinoLogger,
    private subscriberProcessQueueService: SubscriberProcessQueueService,
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
        splitByRecipientType(mappedRecipients);
      const subscribersToProcess = Array.from(singleSubscribers.values());

      if (subscribersToProcess.length > 0) {
        await this.sendToProcessSubscriberService(
          command,
          subscribersToProcess,
          SubscriberSourceEnum.SINGLE
        );
      }

      const isEnabled = await this.getFeatureFlag.execute(
        GetFeatureFlagCommand.create({
          environmentId,
          organizationId,
          userId,
          key: FeatureFlagsKeysEnum.IS_TOPIC_NOTIFICATION_ENABLED,
        })
      );

      if (!isEnabled) {
        Logger.log(
          `The IS_TOPIC_NOTIFICATION_ENABLED feature flag is disabled, skipping trigger multicast`,
          LOG_CONTEXT
        );

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
      let subscribersList: ISubscribersDefine[] = [];
      const getTopicDistinctSubscribersGenerator =
        await this.topicSubscribersRepository.getTopicDistinctSubscribers({
          query: {
            _organizationId: organizationId,
            _environmentId: environmentId,
            topicIds: topicIds,
            excludeSubscribers: singleSubscriberIds,
          },
          batchSize: SUBSCRIBER_TOPIC_DISTINCT_BATCH_SIZE,
        });

      for await (const externalSubscriberIdGroup of getTopicDistinctSubscribersGenerator) {
        const externalSubscriberId = externalSubscriberIdGroup._id;

        if (actor && actor.subscriberId === externalSubscriberId) {
          continue;
        }

        subscribersList.push({ subscriberId: externalSubscriberId });

        if (subscribersList.length === SUBSCRIBER_TOPIC_DISTINCT_BATCH_SIZE) {
          await this.sendToProcessSubscriberService(
            command,
            subscribersList,
            SubscriberSourceEnum.TOPIC
          );

          subscribersList = [];
        }
      }

      if (subscribersList.length > 0) {
        await this.sendToProcessSubscriberService(
          command,
          subscribersList,
          SubscriberSourceEnum.TOPIC
        );
      }
    }
  }

  private async getTopicsByTopicKeys(
    organizationId: string,
    environmentId: string,
    topicKeys: Set<string>
  ): Promise<Pick<TopicEntity, '_id' | 'key'>[]> {
    return await this.topicRepository.find(
      {
        _organizationId: organizationId,
        _environmentId: environmentId,
        key: { $in: Array.from(topicKeys) },
      },
      '_id key'
    );
  }

  private validateTopicExist(
    topics: Pick<TopicEntity, '_id' | 'key'>[],
    topicKeys: Set<string>
  ) {
    if (topics.length === topicKeys.size) {
      return;
    }

    const storageTopicsKeys = topics.map((topic) => topic.key);
    const notFoundTopics = [...topicKeys].filter(
      (topicKey) => !storageTopicsKeys.includes(topicKey)
    );

    if (notFoundTopics.length > 0) {
      throw new NotFoundException(
        `Topic with key ${notFoundTopics.join()} not found in current environment`
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

  public async sendToProcessSubscriberService(
    command: TriggerMulticastCommand,
    subscribers: ISubscribersDefine[],
    _subscriberSource: SubscriberSourceEnum
  ) {
    if (subscribers.length === 0) {
      return;
    }

    const jobs = mapSubscribersToJobs(_subscriberSource, subscribers, command);

    return await this.subscriberProcessQueueAddBulk(jobs);
  }
}

export const splitByRecipientType = (
  mappedRecipients: TriggerRecipient[]
): {
  singleSubscribers: Map<string, ISubscribersDefine>;
  topicKeys: Set<string>;
} => {
  return mappedRecipients.reduce(
    (acc, recipient) => {
      if (!recipient) {
        return acc;
      }

      if (isTopic(recipient)) {
        acc.topicKeys.add(recipient.topicKey);
      } else {
        const subscribersDefine = buildSubscriberDefine(recipient);

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
};

export const buildSubscriberDefine = (
  recipient: TriggerRecipientSubscriber
): ISubscribersDefine => {
  if (typeof recipient === 'string') {
    return { subscriberId: recipient };
  } else {
    validateSubscriberDefine(recipient);

    return recipient;
  }
};

export const validateSubscriberDefine = (recipient: ISubscribersDefine) => {
  if (!recipient) {
    throw new ApiException(
      'subscriberId under property to is not configured, please make sure all subscribers contains subscriberId property'
    );
  }

  if (Array.isArray(recipient)) {
    throw new ApiException(
      'subscriberId under property to is type array, which is not allowed please make sure all subscribers ids are strings'
    );
  }

  if (!recipient.subscriberId) {
    throw new ApiException(
      'subscriberId under property to is not configured, please make sure all subscribers contains subscriberId property'
    );
  }
};

export const mapSubscribersToJobs = (
  _subscriberSource: SubscriberSourceEnum,
  subscribers: ISubscribersDefine[],
  command: TriggerMulticastCommand
): IProcessSubscriberBulkJobDto[] => {
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
};
