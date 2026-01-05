import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
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
  NotificationTemplateEntity,
  PreferencesRepository,
  SubscriberEntity,
  SubscriberRepository,
  TopicSubscribersRepository,
} from '@novu/dal';
import {
  buildWorkflowPreferences,
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
import {
  GetSubscriberGlobalPreference,
  GetSubscriberGlobalPreferenceCommand,
} from '../../../subscribers/usecases/get-subscriber-global-preference';
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
    private preferencesRepository: PreferencesRepository
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

    const subscription = await this.topicSubscribersRepository.findOne({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      identifier: command.subscriptionIdentifier,
    });

    return subscription?._id;
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
      const preferenceEntity = await this.preferencesRepository.findOne({
        _environmentId: command.environmentId,
        _subscriberId: subscriber._id,
        _templateId: workflow._id,
        _topicSubscriptionId: internalSubscriptionId,
        type: PreferencesTypeEnum.SUBSCRIPTION_SUBSCRIBER_WORKFLOW,
      });

      const builtPreferences = buildWorkflowPreferences(preferenceEntity?.preferences);
      const channels = GetPreferences.mapWorkflowPreferencesToChannelPreferences(preferenceEntity?.preferences || {});

      return {
        level: PreferenceLevelEnum.TEMPLATE,
        enabled: builtPreferences.all.enabled,
        condition: builtPreferences.all.condition,
        subscriptionId: internalSubscriptionId,
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
          subscriptionId: internalSubscriptionId,
        })
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
      })
    );
  }
}
