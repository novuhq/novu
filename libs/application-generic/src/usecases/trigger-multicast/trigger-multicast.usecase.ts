import { BadRequestException, Injectable } from '@nestjs/common';
import { TopicEntity, TopicRepository, TopicSubscribersRepository } from '@novu/dal';
import {
  ISubscribersDefine,
  ITopic,
  SubscriberSourceEnum,
  TriggerRecipient,
  TriggerRecipientSubscriber,
  TriggerRecipientsTypeEnum,
} from '@novu/shared';

import { PinoLogger } from 'nestjs-pino';
import { InstrumentUsecase } from '../../instrumentation';
import { CacheService, FeatureFlagsService } from '../../services';
import type { EventType, Trace } from '../../services/analytic-logs';
import { LogRepository, mapEventTypeToTitle, TraceLogRepository } from '../../services/analytic-logs';
import { SubscriberProcessQueueService } from '../../services/queues/subscriber-process-queue.service';
import { TriggerBase } from '../trigger-base';
import { TriggerMulticastCommand } from './trigger-multicast.command';

const QUEUE_CHUNK_SIZE = Number(process.env.MULTICAST_QUEUE_CHUNK_SIZE) || 100;
const SUBSCRIBER_TOPIC_DISTINCT_BATCH_SIZE = Number(process.env.SUBSCRIBER_TOPIC_DISTINCT_BATCH_SIZE) || 100;

const isNotTopic = (recipient: TriggerRecipient): recipient is TriggerRecipientSubscriber => !isTopic(recipient);

const isTopic = (recipient: TriggerRecipient): recipient is ITopic =>
  (recipient as ITopic).type && (recipient as ITopic).type === TriggerRecipientsTypeEnum.TOPIC;

@Injectable()
export class TriggerMulticast extends TriggerBase {
  constructor(
    subscriberProcessQueueService: SubscriberProcessQueueService,
    private topicSubscribersRepository: TopicSubscribersRepository,
    private topicRepository: TopicRepository,
    protected cacheService: CacheService,
    protected featureFlagsService: FeatureFlagsService,
    protected logger: PinoLogger,
    private traceLogRepository: TraceLogRepository
  ) {
    super(subscriberProcessQueueService, cacheService, featureFlagsService, logger, QUEUE_CHUNK_SIZE);
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  async execute(command: TriggerMulticastCommand) {
    const { environmentId, organizationId, to: recipients, actor } = command;

    try {
      const mappedRecipients = Array.isArray(recipients) ? recipients : [recipients];

      const { singleSubscribers, topicKeys } = splitByRecipientType(mappedRecipients);
      const subscribersToProcess = Array.from(singleSubscribers.values());
      let totalProcessed = 0;

      if (subscribersToProcess.length > 0) {
        await this.sendToProcessSubscriberService(command, subscribersToProcess, SubscriberSourceEnum.SINGLE);
        totalProcessed += subscribersToProcess.length;
      }

      const topics = await this.getTopicsByTopicKeys(organizationId, environmentId, topicKeys);

      await this.validateTopicExist(command, topics, topicKeys);

      const topicIds = topics.map((topic) => topic._id);
      const singleSubscriberIds = Array.from(singleSubscribers.keys());
      let subscribersList: { subscriberId: string; topics: Pick<TopicEntity, '_id' | 'key'>[] }[] = [];
      const getTopicDistinctSubscribersGenerator = this.topicSubscribersRepository.getTopicDistinctSubscribers({
        query: {
          _organizationId: organizationId,
          _environmentId: environmentId,
          topicIds,
          excludeSubscribers: singleSubscriberIds,
        },
        batchSize: SUBSCRIBER_TOPIC_DISTINCT_BATCH_SIZE,
      });

      for await (const externalSubscriberIdGroup of getTopicDistinctSubscribersGenerator) {
        const externalSubscriberId = externalSubscriberIdGroup._id;

        if (actor && actor.subscriberId === externalSubscriberId) {
          continue;
        }

        subscribersList.push({
          subscriberId: externalSubscriberId,
          topics: topics?.map((topic) => ({ _id: topic._id, key: topic.key })),
        });

        if (subscribersList.length === SUBSCRIBER_TOPIC_DISTINCT_BATCH_SIZE) {
          await this.sendToProcessSubscriberService(command, subscribersList, SubscriberSourceEnum.TOPIC);
          totalProcessed += subscribersList.length;

          subscribersList = [];
        }
      }

      await this.createMulticastTrace(
        command,
        'request_subscriber_processing_completed',
        'success',
        'Subscriber processing completed successfully',
        {
          addressingType: 'multicast',
          workflowId: command.template._id,
          totalSubscribers: totalProcessed,
          singleSubscribers: subscribersToProcess.length,
          topicSubscribers: totalProcessed - subscribersToProcess.length,
          topicsUsed: topics.length,
        }
      );

      if (subscribersList.length > 0) {
        await this.sendToProcessSubscriberService(command, subscribersList, SubscriberSourceEnum.TOPIC);
        totalProcessed += subscribersList.length;
      }
    } catch (e) {
      const error = e as Error;
      await this.createMulticastTrace(
        command,
        'request_failed',
        'error',
        `Multicast processing failed: ${error.message}`,
        {
          addressingType: 'multicast',
          workflowId: command.template._id,
          error: error.message,
          stack: error.stack,
        }
      );

      this.logger.error(
        {
          transactionId: command.transactionId,
          organization: command.organizationId,
          triggerIdentifier: command.identifier,
          userId: command.userId,
          error: e,
        },
        'Unexpected error has occurred when processing multicast'
      );

      throw e;
    }
  }

  private async createMulticastTrace(
    command: TriggerMulticastCommand,
    eventType: EventType,
    status: 'success' | 'error' | 'warning' = 'success',
    message?: string,
    rawData?: any
  ): Promise<void> {
    if (!command.requestId) {
      return;
    }

    try {
      const traceData: Omit<Trace, 'id' | 'expires_at'> = {
        created_at: LogRepository.formatDateTime64(new Date()),
        organization_id: command.organizationId,
        environment_id: command.environmentId,
        user_id: command.userId,
        subscriber_id: null,
        external_subscriber_id: null,
        event_type: eventType,
        title: mapEventTypeToTitle(eventType),
        message: message || null,
        raw_data: rawData ? JSON.stringify(rawData) : null,
        status,
        entity_type: 'request',
        entity_id: command.requestId,
        workflow_run_identifier: command.template.triggers[0].identifier,
      };

      await this.traceLogRepository.createRequest([traceData]);
    } catch (error) {
      this.logger.error(
        {
          error,
          eventType,
          transactionId: command.transactionId,
          organizationId: command.organizationId,
          environmentId: command.environmentId,
        },
        'Failed to create multicast trace'
      );
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

  private async validateTopicExist(
    command: TriggerMulticastCommand,
    topics: Pick<TopicEntity, '_id' | 'key'>[],
    topicKeys: Set<string>
  ) {
    if (topics.length === topicKeys.size) {
      return;
    }

    const storageTopicsKeys = topics.map((topic) => topic.key);
    const notFoundTopics = [...topicKeys].filter((topicKey) => !storageTopicsKeys.includes(topicKey));

    if (notFoundTopics.length > 0) {
      this.logger.warn(`Topic with key ${notFoundTopics.join()} not found in current environment`);
      await this.createMulticastTrace(command, 'topic_not_found', 'warning', 'Multicast processing failed', {
        addressingType: 'multicast',
        workflowId: command.template._id,
        topicKeys: notFoundTopics,
      });
    }
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

        acc.singleSubscribers.set(subscribersDefine.subscriberId, subscribersDefine);
      }

      return acc;
    },
    {
      singleSubscribers: new Map<string, ISubscribersDefine>(),
      topicKeys: new Set<string>(),
    }
  );
};

export const buildSubscriberDefine = (recipient: TriggerRecipientSubscriber): ISubscribersDefine => {
  if (typeof recipient === 'string') {
    return { subscriberId: recipient };
  } else {
    validateSubscriberDefine(recipient);

    return recipient;
  }
};

export const validateSubscriberDefine = (recipient: ISubscribersDefine) => {
  if (!recipient) {
    throw new BadRequestException(
      'subscriberId under property to is not configured, please make sure all subscribers contains subscriberId property'
    );
  }

  if (Array.isArray(recipient)) {
    throw new BadRequestException(
      'subscriberId under property to is type array, which is not allowed please make sure all subscribers ids are strings'
    );
  }

  if (!recipient.subscriberId) {
    throw new BadRequestException(
      'subscriberId under property to is not configured, please make sure all subscribers contains subscriberId property'
    );
  }
};
