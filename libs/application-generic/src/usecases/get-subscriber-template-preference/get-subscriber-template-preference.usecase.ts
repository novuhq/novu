import { BadRequestException, Injectable } from '@nestjs/common';
import {
  MessageTemplateRepository,
  NotificationTemplateEntity,
  SubscriberEntity,
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
  SeverityLevelEnum,
  StepTypeEnum,
} from '@novu/shared';
import { Instrument, InstrumentUsecase } from '../../instrumentation';
import { buildSubscriberKey, CachedResponse } from '../../services';
import { GetPreferences } from '../get-preferences';
import { GetSubscriberTemplatePreferenceCommand } from './get-subscriber-template-preference.command';

const PRIORITY_ORDER = [
  PreferenceOverrideSourceEnum.TEMPLATE,
  PreferenceOverrideSourceEnum.WORKFLOW_OVERRIDE,
  PreferenceOverrideSourceEnum.SUBSCRIBER,
];

@Injectable()
export class GetSubscriberTemplatePreference {
  constructor(
    private messageTemplateRepository: MessageTemplateRepository,
    private subscriberRepository: SubscriberRepository,
    private workflowOverrideRepository: WorkflowOverrideRepository,
    private tenantRepository: TenantRepository,
    private getPreferences: GetPreferences
  ) {}

  @InstrumentUsecase()
  async execute(command: GetSubscriberTemplatePreferenceCommand): Promise<ISubscriberPreferenceResponse> {
    const subscriber = command.subscriber ?? (await this.getSubscriber(command));

    const initialChannels = await this.getChannels(command);

    const workflowOverride = await this.getWorkflowOverride(command);

    const templateChannelPreference = command.template.preferenceSettings;

    const subscriberWorkflowPreference = await this.getSubscriberWorkflowPreference(command, subscriber._id);
    const workflowOverrideChannelPreference = workflowOverride?.preferenceSettings;

    const { channels, overrides } = overridePreferences(
      {
        template: templateChannelPreference,
        subscriber: subscriberWorkflowPreference.channels,
        workflowOverride: workflowOverrideChannelPreference,
      },
      initialChannels
    );

    const template = mapTemplateConfiguration({
      ...command.template,
      critical: subscriberWorkflowPreference.critical,
    });

    return {
      template,
      preference: {
        enabled: subscriberWorkflowPreference.enabled,
        channels,
        overrides,
      },
      type: subscriberWorkflowPreference.type,
    };
  }

  @Instrument()
  private async getSubscriberWorkflowPreference(
    command: GetSubscriberTemplatePreferenceCommand,
    subscriberId: string
  ): Promise<{
    channels: IPreferenceChannels;
    critical?: boolean;
    type: PreferencesTypeEnum;
    enabled: boolean;
  }> {
    const subscriberWorkflowPreference = await this.getPreferences.safeExecute({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      subscriberId,
      templateId: command.template._id,
    });

    const subscriberWorkflowChannels = GetPreferences.mapWorkflowPreferencesToChannelPreferences(
      subscriberWorkflowPreference.preferences
    );
    const subscriberPreferenceType = subscriberWorkflowPreference.type;
    const critical = subscriberWorkflowPreference.preferences?.all?.readOnly;
    const enabled = true;

    return {
      channels: subscriberWorkflowChannels,
      critical,
      type: subscriberPreferenceType,
      enabled,
    };
  }

  @Instrument()
  private async getWorkflowOverride(command: GetSubscriberTemplatePreferenceCommand) {
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

  @Instrument()
  private async getChannels(command: GetSubscriberTemplatePreferenceCommand): Promise<IPreferenceChannels> {
    let includedChannels: ChannelTypeEnum[];
    if (command.includeInactiveChannels === true) {
      includedChannels = Object.values(ChannelTypeEnum);
    } else {
      includedChannels = await this.queryActiveChannels(command);
    }

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

    return initialChannels;
  }

  @Instrument()
  private async queryActiveChannels(command: GetSubscriberTemplatePreferenceCommand): Promise<ChannelTypeEnum[]> {
    const activeSteps = command.template.steps.filter((step) => step.active === true);

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
        ...new Set(messageTemplates.map((messageTemplate) => messageTemplate.type) as unknown as ChannelTypeEnum[]),
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

  @CachedResponse({
    builder: (command: GetSubscriberTemplatePreferenceCommand) =>
      buildSubscriberKey({
        _environmentId: command.environmentId,
        subscriberId: command.subscriberId,
      }),
  })
  private async getSubscriber(command: GetSubscriberTemplatePreferenceCommand): Promise<SubscriberEntity | null> {
    if (command.subscriber) {
      return command.subscriber;
    }

    const subscriber = await this.subscriberRepository.findBySubscriberId(command.environmentId, command.subscriberId);

    if (!subscriber) {
      throw new BadRequestException(`Subscriber ${command.subscriberId} not found`);
    }

    return subscriber;
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

    const index = overrides.findIndex((overrideReason) => overrideReason.channel === channelName);

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
    const sourcePreference = preferenceSources[sourceName] as IPreferenceChannels;

    // subscriber may miss preference if he did not toggle his preferences
    if (!sourcePreference) continue;

    result = overridePreference(result, sourcePreference, sourceName);
  }

  return result;
}

export const filteredPreference = (preferences: IPreferenceChannels, filterKeys: string[]): IPreferenceChannels =>
  Object.entries(preferences).reduce(
    (obj, [key, value]) => (filterKeys.includes(key) ? { ...obj, [key]: value } : obj),
    {}
  );

export function mapTemplateConfiguration(template: NotificationTemplateEntity): ITemplateConfiguration {
  return {
    _id: template._id,
    name: template.name,
    tags: template?.tags || [],
    critical: template.critical != null ? template.critical : true,
    triggers: template.triggers,
    ...(template.data ? { data: template.data } : {}),
    updatedAt: template.updatedAt,
    createdAt: template.createdAt,
    severity: template.severity ?? SeverityLevelEnum.NONE,
  };
}
