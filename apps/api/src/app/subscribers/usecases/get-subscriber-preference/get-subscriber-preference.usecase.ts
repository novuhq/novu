import { Injectable, NotFoundException } from '@nestjs/common';
import {
  NotificationTemplateRepository,
  SubscriberRepository,
  PreferencesRepository,
  NotificationTemplateEntity,
  PreferencesEntity,
} from '@novu/dal';
import {
  ChannelTypeEnum,
  IPreferenceChannels,
  ISubscriberPreferenceResponse,
  PreferencesTypeEnum,
  StepTypeEnum,
} from '@novu/shared';

import {
  Instrument,
  InstrumentUsecase,
  MergePreferences,
  GetPreferences,
  GetPreferencesResponseDto,
  PreferenceSet,
  filteredPreference,
  overridePreferences,
  MergePreferencesCommand,
  mapTemplateConfiguration,
} from '@novu/application-generic';
import { GetSubscriberPreferenceCommand } from './get-subscriber-preference.command';

@Injectable()
export class GetSubscriberPreference {
  constructor(
    private subscriberRepository: SubscriberRepository,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private preferencesRepository: PreferencesRepository
  ) {}

  @InstrumentUsecase()
  async execute(command: GetSubscriberPreferenceCommand): Promise<ISubscriberPreferenceResponse[]> {
    const subscriber = await this.subscriberRepository.findBySubscriberId(command.environmentId, command.subscriberId);
    if (!subscriber) {
      throw new NotFoundException(`Subscriber with id: ${command.subscriberId} not found`);
    }

    const workflowList = await this.notificationTemplateRepository.filterActive({
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      tags: command.tags,
    });

    const workflowIds = workflowList.map((wf) => wf._id);

    const [
      workflowResourcePreferences,
      workflowUserPreferences,
      subscriberWorkflowPreferences,
      subscriberGlobalPreference,
    ] = await Promise.all([
      this.findWorkflowPreferences({
        environmentId: command.environmentId,
        workflowIds,
      }),
      this.findUserWorkflowPreferences({
        environmentId: command.environmentId,
        workflowIds,
      }),
      this.findSubscriberWorkflowPreferences({
        environmentId: command.environmentId,
        subscriberId: subscriber._id,
        workflowIds,
      }),
      this.findSubscriberGlobalPreferences({
        environmentId: command.environmentId,
        subscriberId: subscriber._id,
      }),
    ]);

    const allWorkflowPreferences = [
      ...workflowResourcePreferences,
      ...workflowUserPreferences,
      ...subscriberWorkflowPreferences,
    ];

    const workflowPreferenceSets = allWorkflowPreferences.reduce<Record<string, PreferenceSet>>((acc, preference) => {
      const workflowId = preference._templateId;

      // Skip if the preference is not for a workflow
      if (workflowId === undefined) {
        return acc;
      }

      if (!acc[workflowId]) {
        acc[workflowId] = {
          workflowResourcePreference: undefined,
          workflowUserPreference: undefined,
          subscriberWorkflowPreference: undefined,
        };
      }
      switch (preference.type) {
        case PreferencesTypeEnum.WORKFLOW_RESOURCE:
          acc[workflowId].workflowResourcePreference = preference as PreferenceSet['workflowResourcePreference'];
          break;
        case PreferencesTypeEnum.USER_WORKFLOW:
          acc[workflowId].workflowUserPreference = preference as PreferenceSet['workflowUserPreference'];
          break;
        case PreferencesTypeEnum.SUBSCRIBER_WORKFLOW:
          acc[workflowId].subscriberWorkflowPreference = preference;
          break;
        default:
      }

      return acc;
    }, {});

    const workflowPreferences: (ISubscriberPreferenceResponse | undefined)[] = this.calculateWorkflowPreferences(
      workflowList,
      workflowPreferenceSets,
      subscriberGlobalPreference,
      command.includeInactiveChannels
    );

    const nonCriticalWorkflowPreferences = workflowPreferences.filter(
      (preference): preference is ISubscriberPreferenceResponse =>
        preference !== undefined && !preference.template.critical
    );

    return nonCriticalWorkflowPreferences;
  }

  @Instrument()
  private calculateWorkflowPreferences(
    workflowList: NotificationTemplateEntity[],
    workflowPreferenceSets: Record<string, PreferenceSet>,
    subscriberGlobalPreference: PreferencesEntity | null,
    includeInactiveChannels: boolean
  ): (ISubscriberPreferenceResponse | undefined)[] {
    return workflowList.map((workflow) => {
      const preferences = workflowPreferenceSets[workflow._id];

      if (!preferences) {
        return;
      }

      const merged = this.mergePreferences(preferences, subscriberGlobalPreference);

      const includedChannels = this.getChannels(workflow, includeInactiveChannels);

      const initialChannels = filteredPreference(
        {
          email: true,
          sms: true,
          in_app: true,
          chat: true,
          push: true,
        },
        includedChannels
      );

      const { channels, overrides } = this.calculateChannelsAndOverrides(merged, initialChannels);

      return {
        preference: {
          channels,
          enabled: true,
          overrides,
        },
        template: mapTemplateConfiguration({
          ...workflow,
          critical: merged.preferences.all.readOnly,
        }),
        type: PreferencesTypeEnum.SUBSCRIBER_WORKFLOW,
      };
    });
  }

  @Instrument()
  private calculateChannelsAndOverrides(merged: GetPreferencesResponseDto, initialChannels: IPreferenceChannels) {
    return overridePreferences(
      {
        template: GetPreferences.mapWorkflowPreferencesToChannelPreferences(merged.source.WORKFLOW_RESOURCE),
        subscriber: GetPreferences.mapWorkflowPreferencesToChannelPreferences(merged.preferences),
        workflowOverride: {},
      },
      initialChannels
    );
  }

  @Instrument()
  private mergePreferences(preferences: PreferenceSet, subscriberGlobalPreference: PreferencesEntity | null) {
    const mergeCommand = MergePreferencesCommand.create({
      workflowResourcePreference: preferences.workflowResourcePreference,
      workflowUserPreference: preferences.workflowUserPreference,
      subscriberWorkflowPreference: preferences.subscriberWorkflowPreference,
      ...(subscriberGlobalPreference ? { subscriberGlobalPreference } : {}),
    });

    return MergePreferences.execute(mergeCommand);
  }

  private getChannels(workflow: NotificationTemplateEntity, includeInactiveChannels: boolean): ChannelTypeEnum[] {
    if (includeInactiveChannels) {
      return Object.values(ChannelTypeEnum);
    }

    const activeSteps = workflow.steps.filter((step) => step.active === true);

    const channels = activeSteps
      .map((item) => item.template?.type as StepTypeEnum)
      .reduce<StepTypeEnum[]>((list, channel) => {
        if (list.includes(channel)) {
          return list;
        }
        list.push(channel);

        return list;
      }, []);

    return channels as unknown as ChannelTypeEnum[];
  }

  @Instrument()
  private async findWorkflowPreferences({
    environmentId,
    workflowIds,
  }: {
    environmentId: string;
    workflowIds: string[];
  }) {
    return this.preferencesRepository.find({
      _templateId: { $in: workflowIds },
      _environmentId: environmentId,
      type: PreferencesTypeEnum.WORKFLOW_RESOURCE,
    });
  }

  @Instrument()
  private async findUserWorkflowPreferences({
    environmentId,
    workflowIds,
  }: {
    environmentId: string;
    workflowIds: string[];
  }) {
    return this.preferencesRepository.find({
      _templateId: { $in: workflowIds },
      _environmentId: environmentId,
      type: PreferencesTypeEnum.USER_WORKFLOW,
    });
  }

  @Instrument()
  private async findSubscriberWorkflowPreferences({
    environmentId,
    subscriberId,
    workflowIds,
  }: {
    environmentId: string;
    subscriberId: string;
    workflowIds: string[];
  }) {
    return this.preferencesRepository.find({
      _templateId: { $in: workflowIds },
      _subscriberId: subscriberId,
      _environmentId: environmentId,
      type: PreferencesTypeEnum.SUBSCRIBER_WORKFLOW,
    });
  }

  @Instrument()
  private async findSubscriberGlobalPreferences({
    environmentId,
    subscriberId,
  }: {
    environmentId: string;
    subscriberId: string;
  }) {
    return this.preferencesRepository.findOne({
      _subscriberId: subscriberId,
      _environmentId: environmentId,
      type: PreferencesTypeEnum.SUBSCRIBER_GLOBAL,
    });
  }
}
