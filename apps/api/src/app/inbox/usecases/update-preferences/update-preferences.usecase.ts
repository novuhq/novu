import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  FeatureFlagsService,
  GetPreferences,
  GetSubscriberTemplatePreference,
  GetSubscriberTemplatePreferenceCommand,
  GetWorkflowByIdsCommand,
  GetWorkflowByIdsUseCase,
  Instrument,
  InstrumentUsecase,
  SendWebhookMessage,
  UpsertPreferences,
  UpsertSubscriberGlobalPreferencesCommand,
  UpsertSubscriberWorkflowPreferencesCommand,
} from '@novu/application-generic';
import {
  BaseRepository,
  EnforceEnvOrOrgIds,
  NotificationTemplateEntity,
  PreferencesDBModel,
  PreferencesRepository,
  SubscriberEntity,
  SubscriberRepository,
  TopicSubscribersRepository,
} from '@novu/dal';
import {
  buildWorkflowPreferences,
  FeatureFlagsKeysEnum,
  IPreferenceChannels,
  PreferenceLevelEnum,
  PreferencesTypeEnum,
  Schedule,
  SeverityLevelEnum,
  WebhookEventEnum,
  WebhookObjectTypeEnum,
  WorkflowPreferences,
  WorkflowPreferencesPartial,
} from '@novu/shared';
import { FilterQuery } from 'mongoose';
import {
  GetSubscriberGlobalPreference,
  GetSubscriberGlobalPreferenceCommand,
} from '../../../subscribers/usecases/get-subscriber-global-preference';
import { stripContextFromIdentifier } from '../../../subscriptions/utils/subscriptions';
import { InboxPreference } from '../../utils/types';
import { UpdatePreferencesCommand } from './update-preferences.command';

@Injectable()
export class UpdatePreferences {
  constructor(
    private subscriberRepository: SubscriberRepository,
    private getSubscriberGlobalPreference: GetSubscriberGlobalPreference,
    private getSubscriberTemplatePreferenceUsecase: GetSubscriberTemplatePreference,
    private upsertPreferences: UpsertPreferences,
    private getWorkflowByIdsUsecase: GetWorkflowByIdsUseCase,
    private sendWebhookMessage: SendWebhookMessage,
    private topicSubscribersRepository: TopicSubscribersRepository,
    private preferencesRepository: PreferencesRepository,
    private featureFlagsService: FeatureFlagsService
  ) {}

  @InstrumentUsecase()
  async execute(command: UpdatePreferencesCommand): Promise<InboxPreference> {
    const subscriber: Pick<SubscriberEntity, '_id'> | null =
      command.subscriber ??
      (await this.subscriberRepository.findBySubscriberId(command.environmentId, command.subscriberId, true, '_id'));
    if (!subscriber) throw new NotFoundException(`Subscriber with id: ${command.subscriberId} is not found`);

    const workflow = await this.getWorkflow(command);
    const internalSubscriptionId = await this.getSubscriptionId(command);

    let newPreference: InboxPreference | null = null;

    await this.updateSubscriberPreference(command, subscriber, workflow?._id, internalSubscriptionId);

    newPreference = await this.findPreference(command, subscriber, workflow, internalSubscriptionId);

    await this.sendWebhookMessage.execute({
      eventType: WebhookEventEnum.PREFERENCE_UPDATED,
      objectType: WebhookObjectTypeEnum.PREFERENCE,
      payload: {
        object: newPreference,
        subscriberId: command.subscriberId,
      },
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      environment: command.environment,
    });

    return newPreference;
  }

  private async getWorkflow(command: UpdatePreferencesCommand): Promise<NotificationTemplateEntity | undefined> {
    if (command.level !== PreferenceLevelEnum.TEMPLATE || !command.workflowIdOrIdentifier) {
      return undefined;
    }

    const workflow =
      command.workflow ??
      (await this.getWorkflowByIdsUsecase.execute(
        GetWorkflowByIdsCommand.create({
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          workflowIdOrInternalId: command.workflowIdOrIdentifier,
        })
      ));

    if (workflow.critical) {
      throw new BadRequestException(`Critical workflow with id: ${command.workflowIdOrIdentifier} can not be updated`);
    }

    return workflow;
  }

  private async getSubscriptionId(command: UpdatePreferencesCommand): Promise<string | undefined> {
    if (command.level !== PreferenceLevelEnum.TEMPLATE || !command.subscriptionIdentifier) {
      return undefined;
    }

    const isContextEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_CONTEXT_PREFERENCES_ENABLED,
      defaultValue: false,
      organization: { _id: command.organizationId },
    });

    let identifier = command.subscriptionIdentifier;
    if (!isContextEnabled) {
      identifier = stripContextFromIdentifier(identifier);
    }

    const useContextFiltering = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_CONTEXT_PREFERENCES_ENABLED,
      defaultValue: false,
      organization: { _id: command.organizationId },
    });

    const contextQuery = this.topicSubscribersRepository.buildContextExactMatchQuery(command.contextKeys, {
      enabled: useContextFiltering,
    });

    // Try to find by identifier first
    let subscription = await this.topicSubscribersRepository.findOne({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      identifier,
      ...contextQuery,
    });

    // If not found by identifier, try by _id (in case subscriptionIdentifier is actually an _id)
    if (!subscription && BaseRepository.isInternalId(command.subscriptionIdentifier)) {
      subscription = await this.topicSubscribersRepository.findOne({
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _id: command.subscriptionIdentifier,
        ...contextQuery,
      });
    }

    return subscription?._id?.toString();
  }

  @Instrument()
  private async updateSubscriberPreference(
    command: UpdatePreferencesCommand,
    subscriber: Pick<SubscriberEntity, '_id'>,
    workflowId: string | undefined,
    internalSubscriptionId: string | undefined
  ): Promise<void> {
    const channelPreferences: IPreferenceChannels = this.buildPreferenceChannels(command);

    await this.storePreferences({
      channels: channelPreferences,
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      _subscriberId: subscriber._id,
      contextKeys: command.contextKeys,
      workflowId,
      subscriptionId: internalSubscriptionId,
      schedule: command.schedule,
      all: command.all,
    });
  }

  private buildPreferenceChannels(command: UpdatePreferencesCommand): IPreferenceChannels {
    return {
      ...(command.chat !== undefined && { chat: command.chat }),
      ...(command.email !== undefined && { email: command.email }),
      ...(command.in_app !== undefined && { in_app: command.in_app }),
      ...(command.push !== undefined && { push: command.push }),
      ...(command.sms !== undefined && { sms: command.sms }),
    };
  }

  @Instrument()
  private async findPreference(
    command: UpdatePreferencesCommand,
    subscriber: Pick<SubscriberEntity, '_id'>,
    workflow: NotificationTemplateEntity | undefined,
    internalSubscriptionId?: string
  ): Promise<InboxPreference> {
    if (
      command.level === PreferenceLevelEnum.TEMPLATE &&
      command.subscriptionIdentifier &&
      command.workflowIdOrIdentifier &&
      workflow
    ) {
      const useContextFiltering = await this.featureFlagsService.getFlag({
        key: FeatureFlagsKeysEnum.IS_CONTEXT_PREFERENCES_ENABLED,
        defaultValue: false,
        organization: { _id: command.organizationId },
      });

      const contextQuery = this.preferencesRepository.buildContextExactMatchQuery(command.contextKeys, {
        enabled: useContextFiltering,
      });

      const query: FilterQuery<PreferencesDBModel> & EnforceEnvOrOrgIds = {
        _environmentId: command.environmentId,
        _subscriberId: subscriber._id,
        _templateId: workflow._id,
        _topicSubscriptionId: internalSubscriptionId,
        type: PreferencesTypeEnum.SUBSCRIPTION_SUBSCRIBER_WORKFLOW,
        ...contextQuery,
      };

      const preferenceEntity = await this.preferencesRepository.findOne(query);

      const builtPreferences = buildWorkflowPreferences(preferenceEntity?.preferences);
      const channels = GetPreferences.mapWorkflowPreferencesToChannelPreferences(preferenceEntity?.preferences || {});

      return {
        level: PreferenceLevelEnum.TEMPLATE,
        enabled: builtPreferences.all.enabled,
        condition: builtPreferences.all.condition,
        subscriptionId: command.subscriptionIdentifier,
        channels,
        workflow: {
          id: workflow._id,
          identifier: workflow.triggers[0]?.identifier,
          name: workflow.name,
          critical: workflow.critical,
          tags: workflow.tags,
          data: workflow.data,
          severity: workflow.severity ?? SeverityLevelEnum.NONE,
        },
      };
    }

    if (command.level === PreferenceLevelEnum.TEMPLATE && command.workflowIdOrIdentifier && workflow) {
      const { preference } = await this.getSubscriberTemplatePreferenceUsecase.execute(
        GetSubscriberTemplatePreferenceCommand.create({
          organizationId: command.organizationId,
          subscriberId: command.subscriberId,
          environmentId: command.environmentId,
          template: workflow,
          subscriber,
          includeInactiveChannels: command.includeInactiveChannels,
          contextKeys: command.contextKeys,
        } as GetSubscriberTemplatePreferenceCommand)
      );

      return {
        level: PreferenceLevelEnum.TEMPLATE,
        enabled: preference.enabled,
        channels: preference.channels,
        workflow: {
          id: workflow._id,
          identifier: workflow.triggers[0].identifier,
          name: workflow.name,
          critical: workflow.critical,
          tags: workflow.tags,
          data: workflow.data,
          severity: workflow.severity ?? SeverityLevelEnum.NONE,
        },
      };
    }

    const { preference } = await this.getSubscriberGlobalPreference.execute(
      GetSubscriberGlobalPreferenceCommand.create({
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        subscriberId: command.subscriberId,
        includeInactiveChannels: command.includeInactiveChannels,
        contextKeys: command.contextKeys,
      })
    );

    return {
      ...preference,
      level: PreferenceLevelEnum.GLOBAL,
    };
  }

  @Instrument()
  private async storePreferences(item: {
    channels: IPreferenceChannels;
    organizationId: string;
    _subscriberId: string;
    environmentId: string;
    contextKeys?: string[];
    workflowId?: string;
    subscriptionId?: string;
    schedule?: Schedule;
    all?: { enabled?: boolean; condition?: unknown };
  }): Promise<void> {
    const preferences: WorkflowPreferencesPartial = {
      ...(item.all && {
        all: {
          ...(item.all.enabled !== undefined && { enabled: item.all.enabled }),
          ...(item.all.condition !== undefined && { condition: item.all.condition }),
        },
      }),
      channels: Object.entries(item.channels).reduce(
        (outputChannels, [channel, enabled]) => ({
          ...outputChannels,
          [channel]: { enabled },
        }),
        {} as WorkflowPreferences['channels']
      ),
    };

    if (item.workflowId && item.subscriptionId) {
      await this.upsertPreferences.upsertTopicSubscriptionPreferences(
        UpsertSubscriberWorkflowPreferencesCommand.create({
          environmentId: item.environmentId,
          organizationId: item.organizationId,
          _subscriberId: item._subscriberId,
          templateId: item.workflowId,
          topicSubscriptionId: item.subscriptionId,
          preferences,
          contextKeys: item.contextKeys,
          returnPreference: false,
        })
      );

      return;
    }

    if (item.workflowId) {
      await this.upsertPreferences.upsertSubscriberWorkflowPreferences(
        UpsertSubscriberWorkflowPreferencesCommand.create({
          environmentId: item.environmentId,
          organizationId: item.organizationId,
          _subscriberId: item._subscriberId,
          templateId: item.workflowId,
          preferences,
          contextKeys: item.contextKeys,
          returnPreference: false,
        })
      );

      return;
    }

    await this.upsertPreferences.upsertSubscriberGlobalPreferences(
      UpsertSubscriberGlobalPreferencesCommand.create({
        preferences,
        environmentId: item.environmentId,
        organizationId: item.organizationId,
        _subscriberId: item._subscriberId,
        returnPreference: false,
        schedule: item.schedule,
        contextKeys: item.contextKeys,
      })
    );
  }
}
