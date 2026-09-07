import { BadRequestException, Injectable } from '@nestjs/common';
import { TopicEntity, TopicRepository, TopicSubscribersRepository } from '@novu/dal';
import {
  FeatureFlagsKeysEnum,
  ISubscribersDefine,
  ITopic,
  SubscriberSourceEnum,
  TriggerRecipient,
  TriggerRecipientSubscriber,
  TriggerRecipientsTypeEnum,
} from '@novu/shared';

import { PinoLogger } from 'nestjs-pino';
import { SubscriberTopicPreference } from '../../dtos';
import { InstrumentUsecase } from '../../instrumentation';
import { CacheService, FeatureFlagsService } from '../../services';
import type { EventType } from '../../services/analytic-logs';
import { LogRepository, mapEventTypeToTitle, TraceLogRepository } from '../../services/analytic-logs';
import { RequestTraceInput } from '../../services/analytic-logs/trace-log';
import { SubscriberProcessQueueService } from '../../services/queues/subscriber-process-queue.service';
import { TriggerBase } from '../trigger-base';
import { TriggerMulticastCommand } from './trigger-multicast.command';

const QUEUE_CHUNK_SIZE = Number(process.env.MULTICAST_QUEUE_CHUNK_SIZE) || 100;
const SUBSCRIBER_TOPIC_DISTINCT_BATCH_SIZE = Number(process.env.SUBSCRIBER_TOPIC_DISTINCT_BATCH_SIZE) || 100;

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
    super(subscriberProcessQueueService, cacheService, logger, QUEUE_CHUNK_SIZE);
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  async execute(command: TriggerMulticastCommand) {
    const { environmentId, organizationId, to: recipients, actor } = command;

    try {
      const mappedRecipients = Array.isArray(recipients) ? recipients : [recipients];

      const { singleSubscribers, topicKeys, topicExclusions } = splitByRecipientType(mappedRecipients);
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
      const allTopicExcludedSubscribers = Array.from(
        new Set([...Array.from(topicExclusions.values()).flatMap((set) => Array.from(set))])
      );

      // Check feature flag and resolve contextKeys
      const useContextFiltering = await this.featureFlagsService.getFlag({
        key: FeatureFlagsKeysEnum.IS_CONTEXT_PREFERENCES_ENABLED,
        defaultValue: false,
        organization: { _id: organizationId },
      });

      // Only pass contextKeys if feature flag is enabled
      const contextKeysForQuery = useContextFiltering ? command.contextKeys : undefined;

      const getTopicDistinctSubscribersGenerator = this.topicSubscribersRepository.getTopicDistinctSubscribers({
        query: {
          _organizationId: organizationId,
          _environmentId: environmentId,
          topicIds,
          excludeSubscribers: [...singleSubscriberIds, ...allTopicExcludedSubscribers],
          contextKeys: contextKeysForQuery,
        },
        batchSize: SUBSCRIBER_TOPIC_DISTINCT_BATCH_SIZE,
      });

      const subscribersMap = new Map<
        string,
        {
          subscriberId: string;
          topics: Array<SubscriberTopicPreference>;
        }
      >();

      for await (const subscription of getTopicDistinctSubscribersGenerator) {
        const externalSubscriberId = subscription.subscriberId;
        const internalSubscriptionId = subscription._id.toString();
        const subscriptionId = subscription.identifier;
        const topicId = subscription._topicId.toString();

        if (actor && actor.subscriberId === externalSubscriberId) {
          continue;
        }

        const topic = topics.find((t) => t._id === topicId);
        if (!topic) {
          continue;
        }

        const existingSubscriber = subscribersMap.get(externalSubscriberId);
        if (existingSubscriber) {
          if (!existingSubscriber.topics.some((t) => t.subscriptionIdentifier === subscriptionId)) {
            existingSubscriber.topics.push({
              _topicId: topic._id,
              topicKey: topic.key,
              _topicSubscriptionId: internalSubscriptionId,
              subscriptionIdentifier: subscriptionId,
            });
          }
        } else {
          subscribersMap.set(externalSubscriberId, {
            subscriberId: externalSubscriberId,
            topics: [
              {
                _topicId: topic._id,
                topicKey: topic.key,
                _topicSubscriptionId: internalSubscriptionId,
                subscriptionIdentifier: subscriptionId,
              },
            ],
          });
        }

        if (subscribersMap.size >= SUBSCRIBER_TOPIC_DISTINCT_BATCH_SIZE) {
          const batchToProcess = Array.from(subscribersMap.values());
          await this.sendToProcessSubscriberService(command, batchToProcess, SubscriberSourceEnum.TOPIC);
          totalProcessed += batchToProcess.length;

          subscribersMap.clear();
        }
      }

      if (subscribersMap.size > 0) {
        const finalBatch = Array.from(subscribersMap.values());
        await this.sendToProcessSubscriberService(command, finalBatch, SubscriberSourceEnum.TOPIC);
        totalProcessed += finalBatch.length;
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

      const logData = {
        transactionId: command.transactionId,
        organization: command.organizationId,
        triggerIdentifier: command.identifier,
        userId: command.userId,
        error: e,
      };

      if (isSubscriberIdValidationError(e)) {
        this.logger.debug(logData, error.message);
      } else {
        this.logger.error(logData, 'Unexpected error has occurred when processing multicast');
      }

      throw e;
    }
  }

  private async createMulticastTrace(
    command: TriggerMulticastCommand,
    eventType: EventType,
    status: 'success' | 'error' | 'warning' = 'success',
    message?: string,
    rawData?: Record<string, unknown>
  ): Promise<void> {
    if (!command.requestId) {
      return;
    }

    try {
      const traceData: RequestTraceInput = {
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
        entity_id: command.requestId,
        workflow_run_identifier: command.template.triggers[0].identifier,
        workflow_id: command.template._id,
        provider_id: '',
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
  topicExclusions: Map<string, Set<string>>;
} => {
  return mappedRecipients.reduce(
    (acc, recipient) => {
      if (!recipient) {
        return acc;
      }

      if (isTopic(recipient)) {
        acc.topicKeys.add(recipient.topicKey);
        const topicRecipient = recipient as ITopic;
        if (topicRecipient.exclude && topicRecipient.exclude.length > 0) {
          const existingExclusions = acc.topicExclusions.get(topicRecipient.topicKey) || new Set<string>();
          for (const subscriberId of topicRecipient.exclude) {
            existingExclusions.add(subscriberId);
          }
          acc.topicExclusions.set(topicRecipient.topicKey, existingExclusions);
        }
      } else {
        const subscribersDefine = buildSubscriberDefine(recipient);

        acc.singleSubscribers.set(subscribersDefine.subscriberId, subscribersDefine);
      }

      return acc;
    },
    {
      singleSubscribers: new Map<string, ISubscribersDefine>(),
      topicKeys: new Set<string>(),
      topicExclusions: new Map<string, Set<string>>(),
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

const SUBSCRIBER_ID_VALIDATION_PREFIX = 'subscriberId under property to';

function isSubscriberIdValidationError(e: unknown): boolean {
  return (
    e instanceof BadRequestException &&
    typeof e.message === 'string' &&
    e.message.startsWith(SUBSCRIBER_ID_VALIDATION_PREFIX)
  );
}

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
