import { BadRequestException, Injectable } from '@nestjs/common';
import {
  PreferencesRepository,
  TopicEntity,
  TopicPreferencesSummary,
  TopicRepository,
  TopicSubscribersRepository,
  TopicWithPreferences,
} from '@novu/dal';
import {
  ISubscribersDefine,
  ITopic,
  PreferencesTypeEnum,
  SubscriberSourceEnum,
  TriggerRecipient,
  TriggerRecipientSubscriber,
  TriggerRecipientsTypeEnum,
  WorkflowPreferencesPartial,
} from '@novu/shared';
import type { RulesLogic } from 'json-logic-js';
import jsonLogic from 'json-logic-js';

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

const isTopic = (recipient: TriggerRecipient): recipient is ITopic =>
  (recipient as ITopic).type && (recipient as ITopic).type === TriggerRecipientsTypeEnum.TOPIC;

@Injectable()
export class TriggerMulticast extends TriggerBase {
  constructor(
    subscriberProcessQueueService: SubscriberProcessQueueService,
    private topicSubscribersRepository: TopicSubscribersRepository,
    private topicRepository: TopicRepository,
    private preferencesRepository: PreferencesRepository,
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
      let totalSubscriptionsEvaluated = 0;
      let totalSubscriptionsFiltered = 0;

      const getTopicDistinctSubscribersGenerator = this.topicSubscribersRepository.getTopicDistinctSubscribers({
        query: {
          _organizationId: organizationId,
          _environmentId: environmentId,
          topicIds,
          excludeSubscribers: [...singleSubscriberIds, ...allTopicExcludedSubscribers],
        },
        batchSize: SUBSCRIBER_TOPIC_DISTINCT_BATCH_SIZE,
      });

      const subscribersMap = new Map<
        string,
        {
          subscriberId: string;
          topics: Array<TopicWithPreferences>;
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

        totalSubscriptionsEvaluated++;

        const evaluationResult = await this.evaluateSubscriptionPreferences(
          command,
          externalSubscriberId,
          internalSubscriptionId,
          subscriptionId
        );

        if (!evaluationResult.result) {
          totalSubscriptionsFiltered++;
          continue;
        }

        const topic = topics.find((t) => t._id === topicId);
        if (!topic) {
          continue;
        }

        const existingSubscriber = subscribersMap.get(externalSubscriberId);
        if (existingSubscriber) {
          if (!existingSubscriber.topics.some((t) => t._topicId === topic._id)) {
            existingSubscriber.topics.push({
              _topicId: topic._id,
              topicKey: topic.key,
              preferenceEvaluation: evaluationResult,
            });
          }
        } else {
          subscribersMap.set(externalSubscriberId, {
            subscriberId: externalSubscriberId,
            topics: [
              {
                _topicId: topic._id,
                topicKey: topic.key,
                preferenceEvaluation: evaluationResult,
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
          subscriptionsEvaluated: totalSubscriptionsEvaluated,
          subscriptionsFiltered: totalSubscriptionsFiltered,
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

  private async evaluateSubscriptionPreferences(
    command: TriggerMulticastCommand,
    externalSubscriberId: string,
    internalSubscriptionId: string,
    subscriptionIdentifier: string
  ): Promise<TopicPreferencesSummary> {
    try {
      const subscriptionPreference = await this.preferencesRepository.findOne({
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _templateId: command.template._id,
        _topicSubscriptionId: internalSubscriptionId,
        type: PreferencesTypeEnum.SUBSCRIPTION_SUBSCRIBER_WORKFLOW,
      });

      if (subscriptionPreference) {
        const passes = await this.evaluatePreferenceCondition(subscriptionPreference.preferences, command.payload);
        const condition = subscriptionPreference.preferences.all?.condition;

        if (!passes) {
          return {
            result: false,
            subscriptionIdentifier,
            condition: condition !== undefined && condition !== null ? condition : undefined,
          };
        }

        return {
          result: true,
          subscriptionIdentifier,
          condition: condition !== undefined && condition !== null ? condition : undefined,
        };
      }

      return { result: true, subscriptionIdentifier };
    } catch (error) {
      this.logger.error(
        {
          error,
          externalSubscriberId,
          workflowId: command.template._id,
          transactionId: command.transactionId,
        },
        'Error evaluating subscription preferences, allowing subscription to pass through'
      );

      return { result: true, subscriptionIdentifier };
    }
  }

  private async evaluatePreferenceCondition(
    preferences: WorkflowPreferencesPartial,
    payload: Record<string, unknown>
  ): Promise<boolean> {
    const condition = preferences.all?.condition;

    if (condition !== undefined && condition !== null) {
      try {
        const result = jsonLogic.apply(condition as RulesLogic, { payload });

        if (typeof result !== 'boolean') {
          this.logger.warn(
            {
              condition,
              result,
            },
            'Preference condition evaluation did not return a boolean, treating as false'
          );
          return false;
        }

        return result;
      } catch (error) {
        this.logger.error(
          {
            error,
            condition,
          },
          'Error evaluating preference condition, treating as false'
        );
        return false;
      }
    }

    const enabled = preferences.all?.enabled;

    if (enabled === undefined || enabled === null) {
      return true;
    }

    return enabled;
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
        workflow_id: command.template._id,
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
