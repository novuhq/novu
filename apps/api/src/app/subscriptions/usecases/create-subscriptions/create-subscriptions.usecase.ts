import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { buildDefaultSubscriptionIdentifier, InstrumentUsecase, PinoLogger } from '@novu/application-generic';
import {
  BaseRepository,
  CreateTopicSubscribersEntity,
  NotificationTemplateEntity,
  NotificationTemplateRepository,
  PreferencesRepository,
  SubscriberEntity,
  SubscriberRepository,
  TopicEntity,
  TopicRepository,
  TopicSubscribersEntity,
  TopicSubscribersRepository,
} from '@novu/dal';
import { PreferencesTypeEnum, SeverityLevelEnum, VALID_ID_REGEX } from '@novu/shared';
import { RulesLogic } from 'json-logic-js';
import _ from 'lodash';
import { GroupPreferenceFilterDto } from '../../../shared/dtos/subscriptions/create-subscriptions.dto';
import {
  CreateSubscriptionsResponseDto,
  SubscriptionErrorDto,
  SubscriptionPreferenceDto,
  SubscriptionResponseDto,
} from '../../../shared/dtos/subscriptions/create-subscriptions-response.dto';
import { CreateSubscriptionPreferencesUsecase } from '../create-subscription-preferences/create-subscription-preferences.usecase';
import { CreateSubscriptionsCommand } from './create-subscriptions.command';

@Injectable()
export class CreateSubscriptionsUsecase {
  constructor(
    private topicRepository: TopicRepository,
    private topicSubscribersRepository: TopicSubscribersRepository,
    private subscriberRepository: SubscriberRepository,
    private preferencesRepository: PreferencesRepository,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private createSubscriptionPreferencesUsecase: CreateSubscriptionPreferencesUsecase,
    private logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  async execute(command: CreateSubscriptionsCommand): Promise<CreateSubscriptionsResponseDto> {
    const workflows = await this.validateAndFetchWorkflows(
      command.preferences,
      command.environmentId,
      command.organizationId
    );
    const topic = await this.upsertTopic(command);

    const errors: SubscriptionErrorDto[] = [];
    const subscriptionData: SubscriptionResponseDto[] = [];

    const externalSubscriberIds = command.subscriptions.map((subscription) => subscription.subscriberId);
    const foundSubscribers = await this.subscriberRepository.searchByExternalSubscriberIds({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      externalSubscriberIds,
    });

    const foundSubscriberIds = foundSubscribers.map((sub) => sub.subscriberId);
    const notFoundSubscriberIds = externalSubscriberIds.filter((id) => !foundSubscriberIds.includes(id));

    for (const subscriberId of notFoundSubscriberIds) {
      errors.push({
        subscriberId,
        code: 'SUBSCRIBER_NOT_FOUND',
        message: `Subscriber with ID '${subscriberId}' could not be found.`,
      });
    }

    if (foundSubscribers.length === 0) {
      return {
        data: [],
        meta: {
          totalCount: command.subscriptions.length,
          successful: 0,
          failed: command.subscriptions.length,
        },
        errors,
      };
    }

    const subscribersToFind = foundSubscribers.map((sub) => ({
      _subscriberId: sub._id.toString(),
      identifier:
        command.subscriptions.find((s) => s.subscriberId === sub.subscriberId)?.identifier ||
        buildDefaultSubscriptionIdentifier(command.topicKey, sub.subscriberId),
    }));
    const existingSubscriptions = await this.topicSubscribersRepository.find({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _topicId: topic._id,
      identifier: { $in: subscribersToFind.map((sub) => sub.identifier) },
    });

    const existingSubscriberIds = existingSubscriptions.map((sub) => sub._subscriberId.toString());
    let subscribersToCreate = foundSubscribers.filter((sub) => !existingSubscriberIds.includes(sub._id.toString()));

    if (subscribersToCreate.length > 0) {
      const { validSubscribers: validSubscribersToCreate, limitErrors: limitErrorsToCreate } =
        await this.validateSubscriptionLimit(topic, subscribersToCreate, command.environmentId, command.organizationId);

      errors.push(...limitErrorsToCreate);

      subscribersToCreate = validSubscribersToCreate;
    }

    for (const subscription of existingSubscriptions) {
      const subscriber = foundSubscribers.find((sub) => sub._id.toString() === subscription._subscriberId.toString());
      const preferences = await this.fetchPreferencesForSubscription(command, subscription, workflows);

      subscriptionData.push({
        _id: subscription._id.toString(),
        identifier: subscription.identifier,
        name: subscription.name,
        topic: {
          _id: topic._id,
          key: topic.key,
          name: topic.name,
        },
        subscriber: subscriber
          ? {
              _id: subscriber._id,
              subscriberId: subscriber.subscriberId,
              avatar: subscriber.avatar,
              firstName: subscriber.firstName,
              lastName: subscriber.lastName,
              email: subscriber.email,
              createdAt: subscriber.createdAt,
              updatedAt: subscriber.updatedAt,
            }
          : null,
        preferences,
        createdAt: subscription.createdAt ?? '',
        updatedAt: subscription.updatedAt ?? '',
      });
    }

    if (subscribersToCreate.length > 0) {
      const subscriptionsToCreate = this.buildSubscriptionEntity(topic, subscribersToCreate, command.subscriptions);
      const newSubscriptions = await this.topicSubscribersRepository.createSubscriptions(subscriptionsToCreate);

      const BATCH_SIZE = 50;
      const subscriptionBatches: TopicSubscribersEntity[][] = _.chunk(newSubscriptions.created, BATCH_SIZE);
      const preferencesArray: Array<{ subscriptionId: string; preferences: SubscriptionPreferenceDto[] }> = [];

      for (const batch of subscriptionBatches) {
        const batchPreferencesArray = await this.createPreferencesForSubscriptionsBatch(command, batch, workflows);

        preferencesArray.push(...batchPreferencesArray);
      }

      for (const subscription of newSubscriptions.created) {
        const subscriber = foundSubscribers.find((sub) => sub._id.toString() === subscription._subscriberId.toString());
        const preferencesEntry = preferencesArray.find((entry) => entry.subscriptionId === subscription._id.toString());
        const preferences = preferencesEntry?.preferences;

        subscriptionData.push({
          _id: subscription._id.toString(),
          identifier: subscription.identifier,
          name: subscription.name,
          topic: {
            _id: topic._id,
            key: topic.key,
            name: topic.name,
          },
          subscriber: subscriber
            ? {
                _id: subscriber._id,
                subscriberId: subscriber.subscriberId,
                avatar: subscriber.avatar,
                firstName: subscriber.firstName,
                lastName: subscriber.lastName,
                email: subscriber.email,
                createdAt: subscriber.createdAt,
                updatedAt: subscriber.updatedAt,
              }
            : null,
          preferences,
          createdAt: subscription.createdAt ?? '',
          updatedAt: subscription.updatedAt ?? '',
        });
      }

      for (const subscription of newSubscriptions.updated) {
        const subscriber = foundSubscribers.find((sub) => sub._id.toString() === subscription._subscriberId.toString());

        const preferences = await this.fetchPreferencesForSubscription(command, subscription, workflows);

        subscriptionData.push({
          _id: subscription._id.toString(),
          identifier: subscription.identifier,
          name: subscription.name,
          topic: {
            _id: topic._id,
            key: topic.key,
            name: topic.name,
          },
          subscriber: subscriber
            ? {
                _id: subscriber._id,
                subscriberId: subscriber.subscriberId,
                avatar: subscriber.avatar,
                firstName: subscriber.firstName,
                lastName: subscriber.lastName,
                email: subscriber.email,
                createdAt: subscriber.createdAt,
                updatedAt: subscriber.updatedAt,
              }
            : null,
          preferences,
          createdAt: subscription.createdAt ?? '',
          updatedAt: subscription.updatedAt ?? '',
        });
      }
    }

    return {
      data: subscriptionData,
      meta: {
        totalCount: command.subscriptions.length,
        successful: subscriptionData.length,
        failed: errors.length,
      },
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  private async upsertTopic(command: CreateSubscriptionsCommand): Promise<TopicEntity> {
    let topic = await this.topicRepository.findTopicByKey(
      command.topicKey,
      command.organizationId,
      command.environmentId
    );

    if (!topic) {
      this.validateTopicKey(command.topicKey);

      topic = await this.topicRepository.createTopic({
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        key: command.topicKey,
        name: command.name,
      });
    } else if (command.name) {
      topic = await this.topicRepository.findOneAndUpdate(
        {
          _id: topic._id,
          _environmentId: command.environmentId,
          _organizationId: command.organizationId,
        },
        {
          $set: { name: command.name },
        }
      );
    }

    if (!topic) {
      throw new Error(`Topic with key ${command.topicKey} not found after upsert`);
    }

    return topic;
  }

  private validateTopicKey(key: string): void {
    if (VALID_ID_REGEX.test(key)) {
      return;
    }

    throw new BadRequestException(
      `Invalid topic key: "${key}". Topic keys must contain only alphanumeric characters (a-z, A-Z, 0-9), hyphens (-), underscores (_), colons (:), or be a valid email address.`
    );
  }

  private async validateSubscriptionLimit(
    topic: TopicEntity,
    subscribers: SubscriberEntity[],
    environmentId: string,
    organizationId: string
  ): Promise<{
    validSubscribers: SubscriberEntity[];
    limitErrors: SubscriptionErrorDto[];
  }> {
    const MAX_SUBSCRIPTIONS_PER_SUBSCRIBER = 10;
    const BATCH_SIZE = 100;

    if (subscribers.length === 0) {
      return { validSubscribers: [], limitErrors: [] };
    }

    const subscriberCountMap = new Map<string, number>();

    for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
      const batch = subscribers.slice(i, i + BATCH_SIZE);
      const subscriberIds = batch.map((sub) => sub._id.toString());

      const batchCountMap = await this.topicSubscribersRepository.countSubscriptionsPerSubscriber({
        environmentId,
        organizationId,
        topicId: topic._id,
        subscriberIds,
      });

      for (const [subscriberId, count] of batchCountMap.entries()) {
        subscriberCountMap.set(subscriberId, count);
      }
    }

    const validSubscribers: SubscriberEntity[] = [];
    const limitErrors: SubscriptionErrorDto[] = [];

    for (const subscriber of subscribers) {
      const count = subscriberCountMap.get(subscriber._id.toString()) || 0;

      if (count >= MAX_SUBSCRIPTIONS_PER_SUBSCRIBER) {
        limitErrors.push({
          subscriberId: subscriber.subscriberId,
          code: 'SUBSCRIPTION_LIMIT_EXCEEDED',
          message: `Subscriber ${subscriber.subscriberId} has reached the maximum allowed of ${MAX_SUBSCRIPTIONS_PER_SUBSCRIBER} subscriptions for topic "${topic.key}"`,
        });
      } else {
        validSubscribers.push(subscriber);
      }
    }

    return { validSubscribers, limitErrors };
  }

  private buildSubscriptionEntity(
    topic: TopicEntity,
    subscribers: SubscriberEntity[],
    subscriptions: Array<{ identifier?: string; subscriberId: string; name?: string }>
  ): CreateTopicSubscribersEntity[] {
    return subscribers.map((subscriber) => {
      const subscription = subscriptions.find((sub) => sub.subscriberId === subscriber.subscriberId);
      return {
        _environmentId: subscriber._environmentId,
        _organizationId: subscriber._organizationId,
        _subscriberId: subscriber._id,
        _topicId: topic._id,
        topicKey: topic.key,
        externalSubscriberId: subscriber.subscriberId,
        identifier: subscription?.identifier || buildDefaultSubscriptionIdentifier(topic.key, subscriber.subscriberId),
        name: subscription?.name,
      };
    });
  }

  private async fetchPreferencesForSubscription(
    command: CreateSubscriptionsCommand,
    subscription: TopicSubscribersEntity,
    workflows: NotificationTemplateEntity[]
  ): Promise<SubscriptionPreferenceDto[] | undefined> {
    if (!command.preferences || command.preferences.length === 0 || workflows.length === 0) {
      return undefined;
    }

    const preferencesEntities = await this.preferencesRepository.find({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _topicSubscriptionId: subscription._id,
      _subscriberId: subscription._subscriberId,
      _templateId: { $in: workflows.map((w) => w._id) },
      type: PreferencesTypeEnum.SUBSCRIPTION_SUBSCRIBER_WORKFLOW,
    });

    if (preferencesEntities.length === 0) {
      return undefined;
    }

    return preferencesEntities
      .map((pref) => {
        const workflowId = pref._templateId?.toString();
        if (!workflowId) {
          return null;
        }

        const workflow = workflows.find((w) => w._id === workflowId);
        const preferences = pref.preferences;

        return {
          workflow: workflow
            ? {
                id: workflow._id,
                identifier: workflow.triggers?.[0]?.identifier || '',
                name: workflow.name || '',
                critical: workflow.critical || false,
                tags: workflow.tags,
                data: workflow.data,
                severity: workflow.severity || SeverityLevelEnum.NONE,
              }
            : undefined,
          subscriptionId: subscription._id.toString(),
          enabled: preferences?.all?.enabled ?? true,
          condition: preferences?.all?.condition as RulesLogic | undefined,
        };
      })
      .filter((pref): pref is NonNullable<typeof pref> => pref !== null);
  }

  private async createPreferencesForSubscriptionsBatch(
    command: CreateSubscriptionsCommand,
    subscriptions: TopicSubscribersEntity[] = [],
    workflows: NotificationTemplateEntity[]
  ): Promise<Array<{ subscriptionId: string; preferences: SubscriptionPreferenceDto[] }>> {
    if (!command.preferences || command.preferences.length === 0) {
      return [];
    }

    return await this.createSubscriptionPreferencesUsecase.executeBatch(
      {
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        userId: command.userId,
        preferences: command.preferences,
        workflows,
      },
      subscriptions
    );
  }

  private async validateAndFetchWorkflows(
    preferences: GroupPreferenceFilterDto[] | undefined,
    environmentId: string,
    organizationId: string
  ): Promise<NotificationTemplateEntity[]> {
    const workflowsById: NotificationTemplateEntity[] = [];
    const workflowsByIdentifier: NotificationTemplateEntity[] = [];
    const workflowsByTags: NotificationTemplateEntity[] = [];

    if (!preferences || preferences.length === 0) {
      return [];
    }

    for (const pref of preferences) {
      const missingWorkflowIds: string[] = [];
      const missingTags: string[] = [];

      const fetchWorkflowIdsByIdsResult = await this.validateAndFetchWorkflowsByIds(
        pref.filter.workflowIds,
        environmentId
      );
      workflowsById.push(...fetchWorkflowIdsByIdsResult.workflowsById);
      workflowsByIdentifier.push(...fetchWorkflowIdsByIdsResult.workflowsByIdentifier);
      missingWorkflowIds.push(...fetchWorkflowIdsByIdsResult.missingWorkflowIds);

      const findByTagsResult = await this.findByTags(pref, organizationId, environmentId);
      workflowsByTags.push(...findByTagsResult.workflowsByTags);
      missingTags.push(...findByTagsResult.missingTags);

      if (missingWorkflowIds.length > 0 || missingTags.length > 0) {
        const errorMessages: string[] = [];

        if (missingWorkflowIds.length > 0) {
          errorMessages.push(
            `Workflows not found: ${missingWorkflowIds.join(', ')}. Please verify the workflow IDs or identifiers exist.`
          );
        }

        if (missingTags.length > 0) {
          errorMessages.push(
            `No workflows found for tags: ${missingTags.join(', ')}. Please verify the tags exist and have associated workflows.`
          );
        }

        throw new NotFoundException(errorMessages.join(' '));
      }
    }

    return _.uniqBy([...workflowsById, ...workflowsByIdentifier, ...workflowsByTags], '_id');
  }

  private async findByTags(
    pref: GroupPreferenceFilterDto,
    organizationId: string,
    environmentId: string
  ): Promise<{ workflowsByTags: NotificationTemplateEntity[]; missingTags: string[] }> {
    const missingTags: string[] = [];
    let workflowsByTags: NotificationTemplateEntity[] = [];

    if (pref.filter.tags && pref.filter.tags.length > 0) {
      workflowsByTags = await this.notificationTemplateRepository.filterActive({
        organizationId,
        environmentId,
        tags: pref.filter.tags,
      });

      for (const tag of pref.filter.tags) {
        const hasWorkflowWithTag = workflowsByTags.some((workflow) => workflow.tags?.includes(tag));
        if (!hasWorkflowWithTag) {
          missingTags.push(tag);
        }
      }
    }
    return { workflowsByTags, missingTags };
  }

  private async validateAndFetchWorkflowsByIds(
    workflowIds: string[] | undefined,
    environmentId: string
  ): Promise<{
    workflowsById: NotificationTemplateEntity[];
    workflowsByIdentifier: NotificationTemplateEntity[];
    missingWorkflowIds: string[];
  }> {
    if (!workflowIds || workflowIds.length === 0) {
      return {
        workflowsById: [],
        workflowsByIdentifier: [],
        missingWorkflowIds: [],
      };
    }

    const internalIds: string[] = [];
    const workflowIdentifiers: string[] = [];

    for (const workflowId of workflowIds) {
      if (BaseRepository.isInternalId(workflowId)) {
        internalIds.push(workflowId);
      } else {
        workflowIdentifiers.push(workflowId);
      }
    }

    let workflowsById: NotificationTemplateEntity[] = [];
    let workflowsByIdentifier: NotificationTemplateEntity[] = [];
    const missingWorkflowIds: string[] = [];

    if (internalIds.length > 0) {
      const uniqueWorkflowIds = [...new Set(internalIds)];
      workflowsById = await this.notificationTemplateRepository.find({
        _id: { $in: uniqueWorkflowIds },
        _environmentId: environmentId,
      });

      const foundWorkflowIds = new Set(workflowsById.map((w) => w._id.toString()));

      for (const workflowId of uniqueWorkflowIds) {
        if (!foundWorkflowIds.has(workflowId)) {
          missingWorkflowIds.push(workflowId);
        }
      }
    }

    if (workflowIdentifiers.length > 0) {
      const uniqueWorkflowIdentifiers = [...new Set(workflowIdentifiers)];
      workflowsByIdentifier = await this.notificationTemplateRepository.findByTriggerIdentifierBulk(
        environmentId,
        uniqueWorkflowIdentifiers
      );

      const foundIdentifiers = new Set(workflowsByIdentifier.map((w) => w.triggers?.[0]?.identifier).filter(Boolean));

      for (const identifier of uniqueWorkflowIdentifiers) {
        if (!foundIdentifiers.has(identifier)) {
          missingWorkflowIds.push(identifier);
        }
      }
    }

    return { workflowsById, workflowsByIdentifier, missingWorkflowIds };
  }
}
