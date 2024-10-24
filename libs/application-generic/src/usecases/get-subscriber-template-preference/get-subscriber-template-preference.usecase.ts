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
  PreferencesTypeEnum,
  StepTypeEnum,
} from '@novu/shared';

import { GetSubscriberTemplatePreferenceCommand } from './get-subscriber-template-preference.command';

import { ApiException } from '../../utils/exceptions';
import { buildSubscriberKey, CachedEntity } from '../../services/cache';
import { GetPreferences } from '../get-preferences';

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
    private tenantRepository: TenantRepository,
    private getPreferences: GetPreferences,
  ) {}

  async execute(
    command: GetSubscriberTemplatePreferenceCommand,
  ): Promise<ISubscriberPreferenceResponse> {
    const subscriber = await this.getSubscriber(command);

    const initialActiveChannels = await this.getActiveChannels(command);

    const workflowOverride = await this.getWorkflowOverride(command);

    const templateChannelPreference = command.template.preferenceSettings;

    const subscriberWorkflowChannelPreferences =
      await this.getSubscriberWorkflowPreference(command, subscriber._id);
    const workflowOverrideChannelPreference =
      workflowOverride?.preferenceSettings;

    const { channels, overrides } = overridePreferences(
      {
        template: templateChannelPreference,
        subscriber: subscriberWorkflowChannelPreferences.channels,
        workflowOverride: workflowOverrideChannelPreference,
      },
      initialActiveChannels,
    );

    const template = mapTemplateConfiguration({
      ...command.template,
      // Use the critical flag from the V2 Preference object if it exists
      ...(subscriberWorkflowChannelPreferences.critical !== undefined && {
        critical: subscriberWorkflowChannelPreferences.critical,
      }),
    });

    return {
      template,
      preference: {
        enabled: subscriberWorkflowChannelPreferences.enabled,
        channels,
        overrides,
      },
      type: subscriberWorkflowChannelPreferences.type,
    };
  }

  private async getSubscriberWorkflowPreference(
    command: GetSubscriberTemplatePreferenceCommand,
    subscriberId: string,
  ): Promise<{
    channels: IPreferenceChannels;
    critical?: boolean;
    type: PreferencesTypeEnum;
    enabled: boolean;
  }> {
    /** @deprecated */
    const subscriberWorkflowPreferenceV1 =
      await this.subscriberPreferenceRepository.findOne(
        {
          _environmentId: command.environmentId,
          _subscriberId: subscriberId,
          _templateId: command.template._id,
        },
        'enabled channels',
        { readPreference: 'secondaryPreferred' },
      );

    const subscriberWorkflowPreferenceV2 =
      await this.getPreferences.safeExecute({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        subscriberId,
        templateId: command.template._id,
      });

    let subscriberWorkflowChannels: IPreferenceChannels;
    let subscriberPreferenceType: PreferencesTypeEnum;
    let critical: boolean | undefined;
    let enabled: boolean;
    // Prefer the V2 preference object if it exists, otherwise fallback to V1
    if (subscriberWorkflowPreferenceV2 !== undefined) {
      subscriberWorkflowChannels =
        GetPreferences.mapWorkflowPreferencesToChannelPreferences(
          subscriberWorkflowPreferenceV2.preferences,
        );
      subscriberPreferenceType = subscriberWorkflowPreferenceV2.type;
      critical = subscriberWorkflowPreferenceV2.preferences?.all?.readOnly;
      enabled = true;
    } else {
      subscriberWorkflowChannels =
        subscriberWorkflowPreferenceV1?.channels ?? {};
      subscriberPreferenceType = PreferencesTypeEnum.SUBSCRIBER_WORKFLOW;
      critical = undefined;
      enabled = subscriberWorkflowPreferenceV1?.enabled ?? true;
    }

    return {
      channels: subscriberWorkflowChannels,
      critical,
      type: subscriberPreferenceType,
      enabled,
    };
  }

  private async getWorkflowOverride(
    command: GetSubscriberTemplatePreferenceCommand,
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
    command: GetSubscriberTemplatePreferenceCommand,
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
      activeChannels,
    );

    return initialActiveChannels;
  }

  private async queryActiveChannels(
    command: GetSubscriberTemplatePreferenceCommand,
  ): Promise<ChannelTypeEnum[]> {
    const activeSteps = command.template.steps.filter(
      (step) => step.active === true,
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
            (messageTemplate) => messageTemplate.type,
          ) as unknown as ChannelTypeEnum[],
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
    builder: (command: GetSubscriberTemplatePreferenceCommand) =>
      buildSubscriberKey({
        _environmentId: command.environmentId,
        subscriberId: command.subscriberId,
      }),
  })
  private async getSubscriber(
    command: GetSubscriberTemplatePreferenceCommand,
  ): Promise<SubscriberEntity | null> {
    if (command.subscriber) {
      return command.subscriber;
    }

    const subscriber = await this.subscriberRepository.findBySubscriberId(
      command.environmentId,
      command.subscriberId,
    );

    if (!subscriber) {
      throw new ApiException(`Subscriber ${command.subscriberId} not found`);
    }

    return subscriber;
  }
}

function updateOverrideReasons(
  channelName,
  sourceName: PreferenceOverrideSourceEnum,
  index: number,
  overrideReasons: IPreferenceOverride[],
) {
  const currentOverride: IPreferenceOverride = {
    channel: channelName as ChannelTypeEnum,
    source: sourceName,
  };

  const notFoundFlag = -1;
  const existsInOverrideReasons = index !== notFoundFlag;
  if (existsInOverrideReasons) {
    // eslint-disable-next-line no-param-reassign
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
  sourceName: PreferenceOverrideSourceEnum,
) {
  const channels = { ...oldPreferenceState.channels };
  const overrides = [...oldPreferenceState.overrides];

  for (const [channelName, channelValue] of Object.entries(sourcePreference)) {
    if (typeof channels[channelName] !== 'boolean') continue;

    const index = overrides.findIndex(
      (overrideReason) => overrideReason.channel === channelName,
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
  initialActiveChannels: IPreferenceChannels,
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
  filterKeys: string[],
): IPreferenceChannels =>
  Object.entries(preferences).reduce(
    (obj, [key, value]) =>
      filterKeys.includes(key) ? { ...obj, [key]: value } : obj,
    {},
  );

function mapTemplateConfiguration(
  template: NotificationTemplateEntity,
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
