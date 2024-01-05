import { Injectable } from '@nestjs/common';
import {
  MessageTemplateRepository,
  NotificationTemplateEntity,
  SubscriberEntity,
  SubscriberPreferenceRepository,
  SubscriberRepository,
  TenantRepository,
  WorkflowOverrideRepository,
} from '@novu/dal';
import {
  ChannelTypeEnum,
  IOverridePreferencesSources,
  IPreferenceChannels,
  IPreferenceOverride,
  ISubscriberPreferenceResponse,
  ITemplateConfiguration,
  PreferenceOverrideSourceEnum,
  StepTypeEnum,
} from '@novu/shared';

import { GetSubscriberTemplatePreferenceCommand } from './get-subscriber-template-preference.command';

import { ApiException } from '../../utils/exceptions';
import { CachedEntity, buildSubscriberKey } from '../../services/cache';

const PRIORITY_ORDER = [
  PreferenceOverrideSourceEnum.TEMPLATE,
  PreferenceOverrideSourceEnum.WORKFLOW_OVERRIDE,
  PreferenceOverrideSourceEnum.SUBSCRIBER,
];

@Injectable()
export class GetSubscriberTemplatePreference {
  constructor(
    private subscriberPreferenceRepository: SubscriberPreferenceRepository,
    private messageTemplateRepository: MessageTemplateRepository,
    private subscriberRepository: SubscriberRepository,
    private workflowOverrideRepository: WorkflowOverrideRepository,
    private tenantRepository: TenantRepository
  ) {}

  async execute(
    command: GetSubscriberTemplatePreferenceCommand
  ): Promise<ISubscriberPreferenceResponse> {
    const subscriber =
      command.subscriber ??
      (await this.fetchSubscriber({
        subscriberId: command.subscriberId,
        _environmentId: command.environmentId,
      }));

    if (!subscriber) {
      throw new ApiException(`Subscriber ${command.subscriberId} not found`);
    }

    const initialActiveChannels = await this.getActiveChannels(command);
    const subscriberPreference =
      await this.subscriberPreferenceRepository.findOne({
        _environmentId: command.environmentId,
        _subscriberId: subscriber._id,
        _templateId: command.template._id,
      });
    const workflowOverride = await this.getWorkflowOverride(command);

    const templateChannelPreference = command.template.preferenceSettings;
    const subscriberChannelPreference = subscriberPreference?.channels;
    const workflowOverrideChannelPreference =
      workflowOverride?.preferenceSettings;

    const { channels, overrides } = overridePreferences(
      {
        template: templateChannelPreference,
        subscriber: subscriberChannelPreference,
        workflowOverride: workflowOverrideChannelPreference,
      },
      initialActiveChannels
    );

    return {
      template: mapTemplateConfiguration(command.template),
      preference: {
        enabled: subscriberPreference?.enabled ?? true,
        channels,
        overrides,
      },
    };
  }

  private async getWorkflowOverride(
    command: GetSubscriberTemplatePreferenceCommand
  ) {
    if (!command.tenant?.identifier) {
      return null;
    }

    const tenant = await this.tenantRepository.findOne({
      _environmentId: command.environmentId,
      identifier: command.tenant.identifier,
    });

    if (!tenant) {
      return null;
    }

    return await this.workflowOverrideRepository.findOne({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _workflowId: command.template._id,
      _tenantId: tenant._id,
    });
  }

  private async getActiveChannels(
    command: GetSubscriberTemplatePreferenceCommand
  ): Promise<IPreferenceChannels> {
    const activeChannels = await this.queryActiveChannels(command);
    const initialActiveChannels = filteredPreference(
      {
        email: true,
        sms: true,
        in_app: true,
        chat: true,
        push: true,
      },
      activeChannels
    );

    return initialActiveChannels;
  }

  private async queryActiveChannels(
    command: GetSubscriberTemplatePreferenceCommand
  ): Promise<ChannelTypeEnum[]> {
    const activeSteps = command.template.steps.filter(
      (step) => step.active === true
    );

    const stepMissingTemplate = activeSteps.some((step) => !step.template);

    if (stepMissingTemplate) {
      const messageIds = activeSteps.map((step) => step._templateId);

      const messageTemplates = await this.messageTemplateRepository.find({
        _environmentId: command.environmentId,
        _id: {
          $in: messageIds,
        },
      });

      return [
        ...new Set(
          messageTemplates.map(
            (messageTemplate) => messageTemplate.type
          ) as unknown as ChannelTypeEnum[]
        ),
      ];
    }

    const channels = activeSteps
      .map((item) => item.template.type as StepTypeEnum)
      .reduce<StepTypeEnum[]>((list, channel) => {
        if (list.includes(channel)) {
          return list;
        }
        list.push(channel);

        return list;
      }, []);

    return channels as unknown as ChannelTypeEnum[];
  }

  @CachedEntity({
    builder: (command: { subscriberId: string; _environmentId: string }) =>
      buildSubscriberKey({
        _environmentId: command._environmentId,
        subscriberId: command.subscriberId,
      }),
  })
  private async fetchSubscriber({
    subscriberId,
    _environmentId,
  }: {
    subscriberId: string;
    _environmentId: string;
  }): Promise<SubscriberEntity | null> {
    return await this.subscriberRepository.findBySubscriberId(
      _environmentId,
      subscriberId
    );
  }
}

function updateOverrideReasons(
  channelName,
  sourceName: PreferenceOverrideSourceEnum,
  index: number,
  overrideReasons: IPreferenceOverride[]
) {
  const currentOverride: IPreferenceOverride = {
    channel: channelName as ChannelTypeEnum,
    source: sourceName,
  };

  const notFoundFlag = -1;
  const existsInOverrideReasons = index !== notFoundFlag;
  if (existsInOverrideReasons) {
    overrideReasons[index] = currentOverride;
  } else {
    overrideReasons.push(currentOverride);
  }
}

function overridePreference(
  oldPreferenceState: {
    overrides: IPreferenceOverride[];
    channels: IPreferenceChannels;
  },
  sourcePreference: IPreferenceChannels,
  sourceName: PreferenceOverrideSourceEnum
) {
  const channels = { ...oldPreferenceState.channels };
  const overrides = [...oldPreferenceState.overrides];

  for (const [channelName, channelValue] of Object.entries(sourcePreference)) {
    if (typeof channels[channelName] !== 'boolean') continue;

    const index = overrides.findIndex(
      (overrideReason) => overrideReason.channel === channelName
    );

    const isSameReason = overrides[index]?.source !== channelValue;

    if (!isSameReason) continue;

    channels[channelName] = channelValue;
    updateOverrideReasons(channelName, sourceName, index, overrides);
  }

  return {
    channels,
    overrides,
  };
}

export function overridePreferences(
  preferenceSources: IOverridePreferencesSources,
  initialActiveChannels: IPreferenceChannels
) {
  let result: {
    overrides: IPreferenceOverride[];
    channels: IPreferenceChannels;
  } = {
    overrides: [],
    channels: { ...initialActiveChannels },
  };

  for (const sourceName of PRIORITY_ORDER) {
    const sourcePreference = preferenceSources[
      sourceName
    ] as IPreferenceChannels;

    // subscriber may miss preference if he did not toggle his preferences
    if (!sourcePreference) continue;

    result = overridePreference(result, sourcePreference, sourceName);
  }

  return result;
}

export const filteredPreference = (
  preferences: IPreferenceChannels,
  filterKeys: string[]
): IPreferenceChannels =>
  Object.entries(preferences).reduce(
    (obj, [key, value]) =>
      filterKeys.includes(key) ? { ...obj, [key]: value } : obj,
    {}
  );

function mapTemplateConfiguration(
  template: NotificationTemplateEntity
): ITemplateConfiguration {
  return {
    _id: template._id,
    name: template.name,
    tags: template?.tags || [],
    critical: template.critical != null ? template.critical : true,
    triggers: template.triggers,
    ...(template.data ? { data: template.data } : {}),
  };
}
