import { Injectable } from '@nestjs/common';
import { SubscriberPreferenceEntity, SubscriberPreferenceRepository } from '@novu/dal';
import { UpdateSubscriberPreferenceCommand } from './update-subscriber-preference.command';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { GetSubscriberPreferenceCommand } from '../get-subscriber-preference/get-subscriber-preference.command';
import {
  GetSubscriberPreference,
  ISubscriberPreferenceResponse,
} from '../get-subscriber-preference/get-subscriber-preference.usecase';

@Injectable()
export class UpdateSubscriberPreference {
  constructor(
    private subscriberPreferenceRepository: SubscriberPreferenceRepository,
    private getSubscriberPreferenceUsecase: GetSubscriberPreference
  ) {}

  async execute(command: UpdateSubscriberPreferenceCommand): Promise<ISubscriberPreferenceResponse[]> {
    const userPreference = await this.subscriberPreferenceRepository.findOne({
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
      _subscriberId: command.subscriberId,
      _templateId: command.templateId,
    });

    if (!userPreference) {
      const channelObj = {} as Record<'email' | 'sms' | 'in_app' | 'direct' | 'push', boolean>;
      channelObj[command.channel?.type] = command.channel?.enabled;

      await this.subscriberPreferenceRepository.create({
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _subscriberId: command.subscriberId,
        _templateId: command.templateId,
        enabled: command.enabled !== false,
        channels: command.channel?.type ? channelObj : null,
      });

      const getSubscriberPreferenceCommand = GetSubscriberPreferenceCommand.create({
        organizationId: command.organizationId,
        subscriberId: command.subscriberId,
        environmentId: command.environmentId,
      });

      return await this.getSubscriberPreferenceUsecase.execute(getSubscriberPreferenceCommand);
    }

    const updatePayload: Partial<SubscriberPreferenceEntity> = {};

    if (command.enabled != null) {
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

    const getSubscriberPreferenceCommand = GetSubscriberPreferenceCommand.create({
      organizationId: command.organizationId,
      subscriberId: command.subscriberId,
      environmentId: command.environmentId,
    });

    return await this.getSubscriberPreferenceUsecase.execute(getSubscriberPreferenceCommand);
  }
}
