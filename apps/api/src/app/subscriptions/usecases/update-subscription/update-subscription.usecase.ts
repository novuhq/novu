import { Injectable, NotFoundException } from '@nestjs/common';
import {
  buildDefaultSubscriptionIdentifier,
  FeatureFlagsService,
  InstrumentUsecase,
  PinoLogger,
} from '@novu/application-generic';
import {
  BaseRepository,
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
import { FeatureFlagsKeysEnum, PreferencesTypeEnum, SeverityLevelEnum } from '@novu/shared';
import { RulesLogic } from 'json-logic-js';
import _ from 'lodash';
import { GroupPreferenceFilterDto } from '../../../shared/dtos/subscriptions/create-subscriptions.dto';
import {
  SubscriptionPreferenceDto,
  SubscriptionResponseDto,
} from '../../../shared/dtos/subscriptions/create-subscriptions-response.dto';
import { stripContextFromIdentifier } from '../../utils/subscriptions';
import { CreateSubscriptionPreferencesCommand } from '../create-subscription-preferences/create-subscription-preferences.command';
import { CreateSubscriptionPreferencesUsecase } from '../create-subscription-preferences/create-subscription-preferences.usecase';
import { UpdateSubscriptionCommand } from './update-subscription.command';

@Injectable()
export class UpdateSubscriptionUsecase {
  constructor(
    private topicRepository: TopicRepository,
    private topicSubscribersRepository: TopicSubscribersRepository,
    private subscriberRepository: SubscriberRepository,
    private preferencesRepository: PreferencesRepository,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private createSubscriptionPreferencesUsecase: CreateSubscriptionPreferencesUsecase,
    private featureFlagsService: FeatureFlagsService,
    private logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  async execute(command: UpdateSubscriptionCommand): Promise<SubscriptionResponseDto> {
    const isContextEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_CONTEXT_PREFERENCES_ENABLED,
      defaultValue: false,
      organization: { _id: command.organizationId },
    });

    if (!isContextEnabled) {
      command.identifier = stripContextFromIdentifier(command.identifier);
    }

    const workflows = await this.validateAndFetchWorkflows(
      command.preferences,
      command.environmentId,
      command.organizationId
    );

    const topic = await this.topicRepository.findTopicByKey(
      command.topicKey,
      command.organizationId,
      command.environmentId
    );

    if (!topic) {
      throw new NotFoundException(`Topic with key ${command.topicKey} not found`);
    }

    const contextQuery = await this.buildContextQuery(command.contextKeys, command.organizationId);

    const subscription = await this.topicSubscribersRepository.findOne({
      identifier: command.identifier,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _topicId: topic._id,
      ...contextQuery,
    });

    if (!subscription) {
      throw new NotFoundException(
        `Subscription with identifier ${command.identifier} not found for topic ${command.topicKey}`
      );
    }

    const updateData: Partial<TopicSubscribersEntity> = {};

    if (command.preferences !== undefined) {
      await this.updatePreferencesForSubscription(command, subscription, workflows);
    }

    if (command.name !== undefined) {
      updateData.name = command.name;
    }

    if (Object.keys(updateData).length > 0) {
      await this.topicSubscribersRepository.update(
        {
          _id: subscription._id,
          _environmentId: command.environmentId,
          _organizationId: command.organizationId,
        },
        updateData
      );
    }

    const updatedSubscription = await this.topicSubscribersRepository.findOne({
      _id: subscription._id,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    });

    if (!updatedSubscription) {
      throw new NotFoundException(`Subscription with ID ${subscription._id} could not be retrieved after update`);
    }

    const subscriber = await this.subscriberRepository.findOne({
      _id: updatedSubscription._subscriberId,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    });

    const preferences = await this.fetchPreferencesForSubscription(
      updatedSubscription,
      command.environmentId,
      command.organizationId,
      workflows,
      command.contextKeys
    );

    return this.mapSubscriptionToDto(updatedSubscription, subscriber, topic, preferences);
  }

  private async updatePreferencesForSubscription(
    command: UpdateSubscriptionCommand,
    subscription: TopicSubscribersEntity,
    workflows: NotificationTemplateEntity[]
  ): Promise<void> {
    const contextQuery = await this.buildContextQuery(command.contextKeys, command.organizationId);

    await this.preferencesRepository.delete({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _topicSubscriptionId: subscription._id,
      _subscriberId: subscription._subscriberId,
      type: PreferencesTypeEnum.SUBSCRIPTION_SUBSCRIBER_WORKFLOW,
      ...contextQuery,
    });

    if (!command.preferences || command.preferences.length === 0) {
      return;
    }

    await this.createSubscriptionPreferencesUsecase.execute(
      CreateSubscriptionPreferencesCommand.create({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        userId: command.userId,
        preferences: command.preferences,
        _topicSubscriptionId: subscription._id.toString(),
        subscriptionId: subscription.identifier,
        _subscriberId: subscription._subscriberId.toString(),
        topicKey: subscription.topicKey,
        externalSubscriberId: subscription.externalSubscriberId,
        workflows,
        contextKeys: subscription.contextKeys,
      })
    );
  }

  private async fetchPreferencesForSubscription(
    subscription: TopicSubscribersEntity,
    environmentId: string,
    organizationId: string,
    workflows: NotificationTemplateEntity[],
    contextKeys?: string[]
  ): Promise<SubscriptionPreferenceDto[] | undefined> {
    if (workflows.length === 0) {
      return undefined;
    }

    const contextQuery = await this.buildContextQuery(contextKeys, organizationId);

    const preferencesEntities = await this.preferencesRepository.find({
      _environmentId: environmentId,
      _organizationId: organizationId,
      _topicSubscriptionId: subscription._id,
      _subscriberId: subscription._subscriberId,
      _templateId: { $in: workflows.map((w) => w._id) },
      type: PreferencesTypeEnum.SUBSCRIPTION_SUBSCRIBER_WORKFLOW,
      ...contextQuery,
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
          subscriptionId:
            subscription.identifier ||
            buildDefaultSubscriptionIdentifier(
              subscription.topicKey,
              subscription.externalSubscriberId,
              subscription.contextKeys
            ),
          enabled: preferences?.all?.enabled ?? true,
          condition: preferences?.all?.condition as RulesLogic | undefined,
        };
      })
      .filter((pref): pref is NonNullable<typeof pref> => pref !== null);
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

      if (missingWorkflowIds.length > 0) {
        this.logger.warn(`Workflows not found: ${missingWorkflowIds.join(', ')}.`);
      }

      if (missingTags.length > 0) {
        this.logger.warn(`No workflows found for tags: ${missingTags.join(', ')}.`);
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

  private mapSubscriptionToDto(
    subscription: TopicSubscribersEntity,
    subscriber: SubscriberEntity | null,
    topic: TopicEntity,
    preferences?: SubscriptionPreferenceDto[]
  ): SubscriptionResponseDto {
    return {
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
      contextKeys: subscription.contextKeys,
      createdAt: subscription.createdAt ?? '',
      updatedAt: subscription.updatedAt ?? '',
    };
  }

  private async buildContextQuery(contextKeys?: string[], organizationId?: string): Promise<Record<string, unknown>> {
    if (!organizationId) {
      return {};
    }

    const useContextFiltering = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_CONTEXT_PREFERENCES_ENABLED,
      defaultValue: false,
      organization: { _id: organizationId },
    });

    return this.topicSubscribersRepository.buildContextExactMatchQuery(contextKeys, {
      enabled: useContextFiltering,
    });
  }
}
