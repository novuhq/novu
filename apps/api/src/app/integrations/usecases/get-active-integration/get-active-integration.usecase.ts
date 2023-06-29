import { Injectable } from '@nestjs/common';

import { SelectIntegration, SelectIntegrationCommand } from '@novu/application-generic';
import { ChannelTypeEnum } from '@novu/shared';
import { IntegrationEntity } from '@novu/dal';

import { GetActiveIntegrationsCommand } from './get-active-integration.command';

@Injectable()
export class GetActiveIntegrations {
  constructor(private selectIntegration: SelectIntegration) {}

  async execute(command: GetActiveIntegrationsCommand): Promise<IntegrationEntity[]> {
    const channelTypes = Object.values(ChannelTypeEnum);

    const integrations = await Promise.all(
      channelTypes.map(async (channelType) => {
        return await this.selectIntegration.execute(
          SelectIntegrationCommand.create({
            environmentId: command.environmentId,
            organizationId: command.organizationId,
            userId: command.userId,
            channelType: channelType,
            providerId: command.providerId,
          })
        );
      })
    );

    return integrations.filter(notEmpty);
  }
}

export function notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
  return value !== null && value !== undefined;
}
