import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AnalyticsService,
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
import { BaseRepository, SubscriberEntity, SubscriberRepository, TopicSubscribersRepository } from '@novu/dal';
import {
  IPreferenceChannels,
  PreferenceLevelEnum,
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
import { AnalyticsEventsEnum } from '../../utils';
import { InboxPreference } from '../../utils/types';
import { UpdatePreferencesCommand } from './update-preferences.command';

@Injectable()
export class UpdatePreferences {
  constructor(
    private subscriberRepository: SubscriberRepository,
    private analyticsService: AnalyticsService,
    private getSubscriberGlobalPreference: GetSubscriberGlobalPreference,
    private getSubscriberTemplatePreferenceUsecase: GetSubscriberTemplatePreference,
    private upsertPreferences: UpsertPreferences,
    private getWorkflowByIdsUsecase: GetWorkflowByIdsUseCase,
    private sendWebhookMessage: SendWebhookMessage,
    private topicSubscribersRepository: TopicSubscribersRepository
  ) {}

  @InstrumentUsecase()
  async execute(command: UpdatePreferencesCommand): Promise<InboxPreference> {
    const subscriber =
      command.subscriber ??
      (await this.subscriberRepository.findBySubscriberId(command.environmentId, command.subscriberId));
    if (!subscriber) throw new NotFoundException(`Subscriber with id: ${command.subscriberId} is not found`);

    const workflowId = await this.getWorkflowId(command);
    const subscriptionId = await this.getSubscriptionId(command);

    let newPreference: InboxPreference | null = null;

    await this.updateSubscriberPreference(command, subscriber, workflowId, subscriptionId);

    newPreference = await this.findPreference(command, subscriber, subscriptionId);

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

  private async getWorkflowId(command: UpdatePreferencesCommand) {
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

    return workflow._id;
  }

  private async getSubscriptionId(command: UpdatePreferencesCommand): Promise<string | undefined> {
    if (command.level !== PreferenceLevelEnum.TEMPLATE || !command.subscriptionIdOrIdentifier) {
      return undefined;
    }

    if (BaseRepository.isInternalId(command.subscriptionIdOrIdentifier)) {
      return command.subscriptionIdOrIdentifier;
    }

    const subscription = await this.topicSubscribersRepository.findOne({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      identifier: command.subscriptionIdOrIdentifier,
    });

    return subscription?._id;
  }

  @Instrument()
  private async updateSubscriberPreference(
    command: UpdatePreferencesCommand,
    subscriber: SubscriberEntity,
    workflowId: string | undefined,
    subscriptionId: string | undefined
  ): Promise<void> {
    const channelPreferences: IPreferenceChannels = this.buildPreferenceChannels(command);

    await this.storePreferences({
      channels: channelPreferences,
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      _subscriberId: subscriber._id,
      workflowId,
      subscriptionId,
      schedule: command.schedule,
      all: command.all,
    });

    this.analyticsService.mixpanelTrack(AnalyticsEventsEnum.UPDATE_PREFERENCES, '', {
      _organization: command.organizationId,
      _subscriber: subscriber._id,
      _workflowId: command.workflowIdOrIdentifier,
      level: command.level,
      channels: channelPreferences,
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
    subscriber: SubscriberEntity,
    subscriptionId?: string
  ): Promise<InboxPreference> {
    if (command.level === PreferenceLevelEnum.TEMPLATE && command.workflowIdOrIdentifier) {
      const workflow =
        command.workflow ??
        (await this.getWorkflowByIdsUsecase.execute(
          GetWorkflowByIdsCommand.create({
            environmentId: command.environmentId,
            organizationId: command.organizationId,
            workflowIdOrInternalId: command.workflowIdOrIdentifier,
          })
        ));

      const { preference } = await this.getSubscriberTemplatePreferenceUsecase.execute(
        GetSubscriberTemplatePreferenceCommand.create({
          organizationId: command.organizationId,
          subscriberId: command.subscriberId,
          environmentId: command.environmentId,
          template: workflow,
          subscriber,
          includeInactiveChannels: command.includeInactiveChannels,
          subscriptionId,
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
