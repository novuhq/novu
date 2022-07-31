import { Injectable } from '@nestjs/common';
import { SubscriberPreferenceRepository, SubscriberPreferenceEntity } from '@novu/dal';
import { UpdateSubscriberPreferenceCommand } from './update-subscriber-preference.command';
import { ApiException } from '../../../shared/exceptions/api.exception';

@Injectable()
export class UpdateSubscriberPreference {
  constructor(private subscriberPreferenceRepository: SubscriberPreferenceRepository) {}

  async execute(command: UpdateSubscriberPreferenceCommand): Promise<SubscriberPreferenceEntity> {
    const userPreference = await this.subscriberPreferenceRepository.findOne({
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
      _subscriberId: command.subscriberId,
      _templateId: command.templateId,
    });

    if (!userPreference) {
      const channelObj = {} as Record<'email' | 'sms' | 'in_app' | 'direct' | 'push', boolean>;
      channelObj[command.channel?.type] = command.channel?.enabled;

      return await this.subscriberPreferenceRepository.create({
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _subscriberId: command.subscriberId,
        _templateId: command.templateId,
        enabled: command.enabled !== false,
        channels: channelObj.hasOwnProperty('undefined') ? null : channelObj,
      });
    }

    const updatePayload: Partial<SubscriberPreferenceEntity> = {};

    if (command.enabled || command.enabled === false) {
      updatePayload.enabled = command.enabled;
    }

    if (command.channel?.type) {
      updatePayload[`channels.${command.channel.type}`] = command.channel.enabled;
    }

    if (Object.keys(updatePayload).length === 0) {
      throw new ApiException('In order to make an update you need to provider channel or enabled');
    }

    await this.subscriberPreferenceRepository.update(
      {
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _subscriberId: command.subscriberId,
        _templateId: command.templateId,
      },
      {
        $set: updatePayload,
      }
    );

    return await this.subscriberPreferenceRepository.findOne({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _subscriberId: command.subscriberId,
      _templateId: command.templateId,
    });
  }
}
