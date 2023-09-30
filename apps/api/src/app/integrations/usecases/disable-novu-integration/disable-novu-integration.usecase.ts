import { Injectable } from '@nestjs/common';
import { IntegrationRepository } from '@novu/dal';

import { DisableNovuIntegrationCommand } from './disable-novu-integration.command';
import { ChannelTypeEnum, EmailProviderIdEnum, ProvidersIdEnum, SmsProviderIdEnum } from '@novu/shared';

@Injectable()
export class DisableNovuIntegration {
  private channelProviderIdMap = new Map<ChannelTypeEnum, ProvidersIdEnum>();

  constructor(private integrationRepository: IntegrationRepository) {
    this.channelProviderIdMap.set(ChannelTypeEnum.EMAIL, EmailProviderIdEnum.Novu);
    this.channelProviderIdMap.set(ChannelTypeEnum.SMS, SmsProviderIdEnum.Novu);
  }

  async execute(command: DisableNovuIntegrationCommand): Promise<void> {
    const novuProviderId = this.channelProviderIdMap.get(command.channel);

    if (!novuProviderId) {
      return;
    }

    if (command.providerId === novuProviderId) {
      return;
    }

    await this.integrationRepository.update(
      { _environmentId: command.environmentId, providerId: novuProviderId, channel: command.channel },
      { $set: { active: false, primary: false, priority: 0 } }
    );
  }
}
