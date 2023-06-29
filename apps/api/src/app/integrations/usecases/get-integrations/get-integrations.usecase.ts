import { Injectable } from '@nestjs/common';
import { IntegrationEntity } from '@novu/dal';
import { GetDecryptedIntegrationsCommand, GetDecryptedIntegrations } from '@novu/application-generic';

import { GetIntegrationsCommand } from './get-integrations.command';

@Injectable()
export class GetIntegrations {
  constructor(private getDecryptedIntegrationsUsecase: GetDecryptedIntegrations) {}

  async execute(command: GetIntegrationsCommand): Promise<IntegrationEntity[]> {
    return await this.getDecryptedIntegrationsUsecase.execute(
      GetDecryptedIntegrationsCommand.create({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        userId: command.userId,
      })
    );
  }
}
